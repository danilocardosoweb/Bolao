import type {
  AdminMatchCoverage,
  AdminParticipantSummary,
  AdminPredictionRecord,
  AdminPredictionsReport,
} from "@/src/types/admin";

type ExportPayload = {
  report: AdminPredictionsReport;
  filteredPredictions: AdminPredictionRecord[];
  filteredParticipants: AdminParticipantSummary[];
  filteredCoverage: AdminMatchCoverage[];
  label: string;
};

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDateTime(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("pt-BR");
}

function createCell(value: unknown, type: "String" | "Number" = "String", styleId = "Cell") {
  const normalized = value ?? "";
  return `<Cell ss:StyleID="${styleId}"><Data ss:Type="${type}">${escapeXml(normalized)}</Data></Cell>`;
}

function createRow(
  values: Array<{ value: unknown; type?: "String" | "Number"; styleId?: string }>,
) {
  return `<Row>${values
    .map((item) => createCell(item.value, item.type || "String", item.styleId || "Cell"))
    .join("")}</Row>`;
}

function worksheet(name: string, rows: string[]) {
  return `<Worksheet ss:Name="${escapeXml(name)}"><Table>${rows.join("")}</Table></Worksheet>`;
}

export function downloadAdminPredictionsWorkbook(payload: ExportPayload) {
  const generatedAt = new Date().toLocaleString("pt-BR");
  const summaryRows = [
    createRow([
      { value: "Painel Administrativo de Palpites", styleId: "Title" },
      { value: "" },
      { value: payload.label, styleId: "Title" },
    ]),
    createRow([
      { value: "Gerado em", styleId: "Header" },
      { value: generatedAt },
      { value: "Base consultada em", styleId: "Header" },
      { value: formatDateTime(payload.report.generatedAt) },
    ]),
    createRow([
      { value: "Participantes", styleId: "Header" },
      { value: payload.report.summary.participants, type: "Number" },
      { value: "Jogos", styleId: "Header" },
      { value: payload.report.summary.matches, type: "Number" },
    ]),
    createRow([
      { value: "Palpites exportados", styleId: "Header" },
      { value: payload.filteredPredictions.length, type: "Number" },
      { value: "Cobertura média", styleId: "Header" },
      { value: `${payload.report.summary.averageCompletionRate}%` },
    ]),
    createRow([
      { value: "Jogos sem palpite", styleId: "Header" },
      { value: payload.report.summary.matchesWithoutPredictions, type: "Number" },
      { value: "Último movimento", styleId: "Header" },
      { value: formatDateTime(payload.report.summary.lastPredictionAt) },
    ]),
  ];

  const participantRows = [
    createRow([
      { value: "Participante", styleId: "Header" },
      { value: "Email", styleId: "Header" },
      { value: "Palpites", styleId: "Header" },
      { value: "Cobertura", styleId: "Header" },
      { value: "Pontos", styleId: "Header" },
      { value: "Exatos", styleId: "Header" },
      { value: "Corretos", styleId: "Header" },
      { value: "Último palpite", styleId: "Header" },
    ]),
    ...payload.filteredParticipants.map((participant) =>
      createRow([
        { value: participant.displayName },
        { value: participant.email },
        { value: participant.totalPredictions, type: "Number" },
        { value: `${participant.completionRate}%` },
        { value: participant.totalPoints, type: "Number" },
        { value: participant.exactMatches, type: "Number" },
        { value: participant.correctResults, type: "Number" },
        { value: formatDateTime(participant.lastPredictionAt) },
      ]),
    ),
  ];

  const predictionRows = [
    createRow([
      { value: "Participante", styleId: "Header" },
      { value: "Email", styleId: "Header" },
      { value: "Jogo", styleId: "Header" },
      { value: "Data", styleId: "Header" },
      { value: "Fase", styleId: "Header" },
      { value: "Grupo", styleId: "Header" },
      { value: "Palpite", styleId: "Header" },
      { value: "Oficial", styleId: "Header" },
      { value: "Status", styleId: "Header" },
      { value: "Pontos", styleId: "Header" },
      { value: "Multiplicador", styleId: "Header" },
      { value: "Estádio", styleId: "Header" },
      { value: "Atualizado em", styleId: "Header" },
    ]),
    ...payload.filteredPredictions.map((prediction) =>
      createRow([
        { value: prediction.displayName },
        { value: prediction.email },
        {
          value: `${prediction.teamAName || prediction.teamACode || "Time A"} x ${
            prediction.teamBName || prediction.teamBCode || "Time B"
          }`,
        },
        { value: formatDateTime(prediction.matchDate) },
        { value: prediction.stage || "" },
        { value: prediction.groupName || "" },
        {
          value:
            prediction.predictedScoreA === null || prediction.predictedScoreB === null
              ? "Sem palpite"
              : `${prediction.predictedScoreA} x ${prediction.predictedScoreB}`,
        },
        {
          value:
            prediction.officialScoreA === null || prediction.officialScoreB === null
              ? "-"
              : `${prediction.officialScoreA} x ${prediction.officialScoreB}`,
        },
        { value: prediction.predictionStatus },
        { value: prediction.pointsEarned, type: "Number" },
        { value: prediction.multiplierApplied, type: "Number" },
        { value: [prediction.stadium, prediction.city].filter(Boolean).join(" • ") },
        { value: formatDateTime(prediction.updatedAt || prediction.createdAt) },
      ]),
    ),
  ];

  const coverageRows = [
    createRow([
      { value: "Jogo", styleId: "Header" },
      { value: "Data", styleId: "Header" },
      { value: "Fase", styleId: "Header" },
      { value: "Grupo", styleId: "Header" },
      { value: "Cobertura", styleId: "Header" },
      { value: "Palpites", styleId: "Header" },
      { value: "Sem palpite", styleId: "Header" },
      { value: "Pontuados", styleId: "Header" },
    ]),
    ...payload.filteredCoverage.map((match) =>
      createRow([
        { value: `${match.teamAName || match.teamACode || "Time A"} x ${match.teamBName || match.teamBCode || "Time B"}` },
        { value: formatDateTime(match.matchDate) },
        { value: match.stage || "" },
        { value: match.groupName || "" },
        { value: `${match.coverageRate}%` },
        { value: match.predictionCount, type: "Number" },
        { value: match.missingParticipants, type: "Number" },
        { value: match.scoredPredictionCount, type: "Number" },
      ]),
    ),
  ];

  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#10211A"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Size="14" ss:Color="#0B2D17"/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#F8F1DF"/>
   <Interior ss:Color="#10211A" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Cell">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8DFD5"/>
   </Borders>
  </Style>
 </Styles>
 ${worksheet("Resumo", summaryRows)}
 ${worksheet("Participantes", participantRows)}
 ${worksheet("Palpites", predictionRows)}
 ${worksheet("Cobertura", coverageRows)}
</Workbook>`;

  const blob = new Blob([workbook], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `central-palpites-${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
