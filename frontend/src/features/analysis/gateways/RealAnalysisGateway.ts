import type { AnalysisDraft } from "../types/analysis-draft";
import type {
  AnalysisResultCategorySummary,
  AnalysisResultTransaction,
  FinancialAnalysisResult,
  FinancialProfileStatus,
} from "../types/analysis-result";
import type { AnalysisGateway } from "./AnalysisGateway";
import { buildMockAnalysisResult } from "../mocks/mockAnalysisResult";
import { createTransaction, getUserTransactions } from "../../../api/transactions";
import { authenticatedFetch, getStoredUserId } from "../../../api/auth";
import { env } from "../../../api/env";
import { getTransactionPeriod } from "../components/transactions/transactionUtils";

/**
 * Gateway real que:
 * 1. Actualiza datos financieros del usuario en el backend
 * 2. Envía las transacciones al backend (el backend las clasifica con el modelo ML via Flask)
 * 3. Obtiene del backend: perfil ML, métricas, y transacciones ya clasificadas
 * 4. Construye el resultado del análisis con datos 100% del backend/ML
 * 5. Si el backend falla, usa resultado local como fallback
 */
export class RealAnalysisGateway implements AnalysisGateway {
  async analyze(draft: AnalysisDraft): Promise<FinancialAnalysisResult> {
    const userId = getStoredUserId();

    if (userId) {
      // 1. Actualizar datos financieros del usuario
      const totalIncome = draft.financialData.incomes.reduce(
        (sum, inc) => sum + inc.monthlyAmount, 0
      );
      const params = new URLSearchParams();
      if (totalIncome > 0) params.set("ingresoMensual", String(totalIncome));
      if (draft.financialData.monthlyDebtPayments != null) {
        params.set("cuotasMensualesDeuda", String(draft.financialData.monthlyDebtPayments));
      }
      if (draft.financialData.emergencyFundAmount != null) {
        params.set("ahorroPrevio", String(draft.financialData.emergencyFundAmount));
      }

      try {
        await authenticatedFetch(`${env.apiBaseUrl}/api/usuarios/${userId}/financial?${params.toString()}`, {
          method: "PUT",
        });
      } catch (e) {
        console.warn("[Analysis] No se pudo actualizar datos financieros:", e);
      }

      // 2. Enviar transacciones al backend (backend clasifica con modelo ML via Flask)
      // Primero enviamos los ingresos como transacciones INCOME para que aparezcan en el gráfico
      for (const income of draft.financialData.incomes) {
        if (income.monthlyAmount > 0) {
          try {
            const today = new Date().toISOString().slice(0, 10);
            await createTransaction({
              nombre_tienda: income.source || "Ingreso",
              monto: income.monthlyAmount,
              categoria_principal: income.source || "Sueldo",
              fecha: `${today}T00:00:00`,
              type: "INCOME",
            });
          } catch (e) {
            console.warn("[Analysis] Error al enviar ingreso:", e);
          }
        }
      }

      // Luego enviamos los gastos
      for (const transaction of draft.transactions) {
        try {
          await createTransaction({
            nombre_tienda: transaction.description,
            monto: transaction.amount,
            categoria_principal: transaction.categoryLabel || "Otras",
            fecha: `${transaction.date}T00:00:00`,
            type: transaction.movementType === "INCOME" ? "INCOME" : "EXPENSE",
            metodo_pago: transaction.paymentMethod?.toLowerCase(),
            esencial: undefined,
          });
        } catch (e) {
          console.warn("[Analysis] Error al enviar transacción:", transaction.description, e);
        }
      }

      // 3. Obtener datos completos del backend (dashboard + transacciones clasificadas)
      try {
        const [dashResponse, allTransactions] = await Promise.all([
          authenticatedFetch(`${env.apiBaseUrl}/dashboard/${userId}`),
          getUserTransactions(),
        ]);

        if (dashResponse.ok) {
          const dashData = await dashResponse.json();
          const metrics = dashData.metrics ?? {};

          // ─── Perfil financiero del modelo ML ───────────────────────────
          const perfilRaw = (metrics.perfil_financiero ?? "").toLowerCase();
          let realProfile: FinancialProfileStatus = "OBSERVATION";
          if (perfilRaw.includes("saludable")) realProfile = "HEALTHY";
          else if (perfilRaw.includes("riesgo")) realProfile = "RISK";

          // ─── Score del modelo (recalculamos igual que el dashboard) ────
          const score = computeScore(metrics);

          // ─── Transacciones clasificadas por el modelo ML ──────────────
          const classifiedTransactions: AnalysisResultTransaction[] = allTransactions
            .filter((t) => t.type === "EXPENSE")
            .map((t) => ({
              id: String(t.id),
              description: t.nombre_tienda ?? "",
              amount: t.monto ?? 0,
              category: t.categoria_principal ?? "Otros",
              confidence: t.confidence != null ? (t.confidence > 1 ? t.confidence / 100 : t.confidence) : undefined,
            }));

          // ─── Gastos y margen (del análisis actual) ────────────────────
          const totalExpenses = metrics.gastos_totales_del_mes ?? 0;
          const monthlyIncome = metrics.ingreso_mensual ?? totalIncome;
          const monthlyDebt = metrics.cuotas_mensuales_deuda ?? 0;
          const monthlyMargin = metrics.ahorro_mensual ?? (monthlyIncome - monthlyDebt - totalExpenses);

          // ─── Categorías desde el backend (clasificadas por ML) ────────
          const backendExpenses: any[] = dashData.expensesByCategory ?? [];
          const byCategory: AnalysisResultCategorySummary[] = backendExpenses.map((item: any) => ({
            category: item.categoria_principal ?? "Otros",
            amount: item.monto ?? 0,
            percentage: item.porcentaje != null ? (item.porcentaje > 1 ? item.porcentaje / 100 : item.porcentaje) : 0,
            count: item.count ?? 0,
          }));

          const finalByCategory = byCategory.length > 0
            ? byCategory
            : buildCategoryFromTransactions(classifiedTransactions, totalExpenses);

          // ─── Período analizado ────────────────────────────────────────
          const expenseTransactions = draft.transactions.filter((t) => t.movementType !== "INCOME");
          const analyzedPeriod = getTransactionPeriod(expenseTransactions);

          // ─── Fondo de emergencia (del backend, misma fórmula del modelo) ─
          const emergencyCoverageMonths = metrics.meses_supervivencia != null && metrics.meses_supervivencia > 0
            ? Math.round(metrics.meses_supervivencia * 100) / 100
            : null;

          // ─── Nivel de endeudamiento (del backend) ─────────────────────
          const debtLevel = metrics.ratio_endeudamiento_dti != null
            ? Math.round(metrics.ratio_endeudamiento_dti * 10000) / 100
            : 0;

          // ─── Insights ─────────────────────────────────────────────────
          const mainCategory = finalByCategory[0]?.category ?? null;
          const expenseRatio = monthlyIncome > 0
            ? Math.round((totalExpenses / monthlyIncome) * 10000) / 100
            : 0;

          const topInsights = [
            {
              id: "insight-main-category",
              label: "Categoría principal de gasto",
              description: mainCategory
                ? `Tu mayor volumen de gasto registrado está en ${mainCategory}.`
                : "No se identificaron categorías predominantes.",
            },
            {
              id: "insight-expense-weight",
              label: "Peso de tus gastos",
              description: `Tus gastos cargados representan aproximadamente ${expenseRatio}% de tus ingresos mensuales.`,
            },
            {
              id: "insight-monthly-margin",
              label: "Margen mensual estimado",
              description: `Tu margen mensual estimado es ${formatCurrencySimple(monthlyMargin)}.`,
            },
          ];

          // ─── Recomendaciones ───────────────────────────────────────────
          const priority = realProfile === "RISK" ? "HIGH" : realProfile === "OBSERVATION" ? "MEDIUM" : "LOW";
          const recommendations = [
            ...(mainCategory ? [{
              id: "rec-main-category",
              priority: priority as "HIGH" | "MEDIUM" | "LOW",
              title: "Revisá tu categoría principal de gasto",
              description: `Analizá si podés optimizar consumos en ${mainCategory}.`,
            }] : []),
            {
              id: "rec-savings",
              priority: "MEDIUM" as const,
              title: "Sostené o fortalecé tu hábito de ahorro",
              description: "Mantener un margen mensual positivo mejora tu capacidad de respuesta.",
            },
          ];

          // ─── Resultado final (100% basado en backend/ML) ──────────────
          return {
            analysisId: `analysis-${Date.now()}`,
            generatedAt: new Date().toISOString(),
            analyzedPeriod: {
              from: analyzedPeriod.start,
              to: analyzedPeriod.end,
            },
            summary: {
              financialProfile: realProfile,
              confidence: score / 100,
              debtLevel,
              monthlyMargin: Math.round(monthlyMargin * 100) / 100,
              emergencyCoverageMonths,
            },
            expenses: {
              totalExpenses,
              mainCategory,
              dailyAverage: null,
              transactionsCount: classifiedTransactions.length,
              byCategory: finalByCategory,
              classifiedTransactions,
              insights: topInsights,
            },
            recommendations,
            topInsights,
          };
        }
      } catch (e) {
        console.warn("[Analysis] No se pudo obtener datos del backend:", e);
      }
    }

    // Fallback: resultado local (solo si el backend no responde)
    return buildMockAnalysisResult(draft);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeScore(metrics: any): number {
  let score = 50;
  const ratioAhorro = metrics.ratio_ahorro_neto ?? 0;
  const ratioDti = metrics.ratio_endeudamiento_dti ?? 0;
  const mesesSup = metrics.meses_supervivencia ?? 0;

  if (ratioAhorro >= 0.20) score += 20;
  else if (ratioAhorro >= 0.10) score += 10;
  else if (ratioAhorro < 0) score -= 15;

  if (ratioDti <= 0.20) score += 15;
  else if (ratioDti > 0.37) score -= 20;

  if (mesesSup >= 3) score += 15;
  else if (mesesSup >= 1) score += 5;
  else score -= 10;

  return Math.max(0, Math.min(100, score));
}

function buildCategoryFromTransactions(
  transactions: AnalysisResultTransaction[],
  totalExpenses: number
): AnalysisResultCategorySummary[] {
  const map = new Map<string, { amount: number; count: number }>();
  for (const t of transactions) {
    const cat = t.category ?? "Otros";
    const current = map.get(cat) ?? { amount: 0, count: 0 };
    current.amount += t.amount;
    current.count += 1;
    map.set(cat, current);
  }
  return Array.from(map.entries())
    .map(([category, { amount, count }]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
      percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 10000) / 100 : 0,
      count,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function formatCurrencySimple(value: number): string {
  const prefix = value < 0 ? "-" : "";
  const abs = Math.abs(Math.round(value));
  return `${prefix}$ ${abs.toLocaleString("es-AR")}`;
}
