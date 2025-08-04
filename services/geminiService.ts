import { GoogleGenAI } from "@google/genai";

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "disabled" });

export const generateMonthlyReport = async (
  month, 
  totalIncome, 
  ownerDistribution,
  propertiesDueForReview
) => {
  if (!process.env.API_KEY) {
    return Promise.resolve("El servicio de IA no está disponible. Configure la API_KEY.");
  }

  const distributionText = ownerDistribution
    .map(o => `${o.name} (${o.percentage}%): $${o.share.toFixed(2)}`)
    .join('\n');

  const reviewText = propertiesDueForReview.length > 0
    ? `Propiedades que requieren revisión de alquiler: ${propertiesDueForReview.join(', ')}.`
    : 'Ninguna propiedad requiere revisión de alquiler este mes.';

  const prompt = `
    Eres un asistente de gestión de propiedades profesional.
    Genera un informe financiero mensual conciso en español para el mes de ${month}.
    El informe debe ser claro, profesional y fácil de entender para los propietarios.
    Utiliza los siguientes datos:
    - Ingresos totales del mes: $${totalIncome.toFixed(2)}
    - Distribución de ganancias a los propietarios:
    ${distributionText}
    - Estado de revisión de contratos:
    ${reviewText}

    Estructura el informe con un título, un resumen de los ingresos, el desglose de la distribución y una sección de notas o acciones recomendadas.
    Usa formato Markdown para una mejor legibilidad.
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating report with Gemini:", error);
    return "Hubo un error al generar el informe. Por favor, inténtelo de nuevo más tarde.";
  }
};
