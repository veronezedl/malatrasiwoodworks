// Desenho esquemático (não técnico) da tábua/peça em escala, para o cliente
// ter uma noção visual do formato enquanto digita as medidas na calculadora
// de /orcamento. Atualiza a cada tecla — sem libs externas, só SVG puro.

const VIEW_WIDTH = 280;
const VIEW_HEIGHT = 200;
const PADDING = 32;

interface QuoteSizeSimulatorProps {
  widthCm: number;
  lengthCm: number;
  heightCm?: number | null;
  handleModelName?: string | null;
}

export function QuoteSizeSimulator({
  widthCm,
  lengthCm,
  heightCm,
  handleModelName,
}: QuoteSizeSimulatorProps) {
  if (!widthCm || !lengthCm || widthCm <= 0 || lengthCm <= 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-brand bg-bg-muted text-center text-sm text-text-muted">
        Preencha as medidas para ver o desenho
      </div>
    );
  }

  const availableW = VIEW_WIDTH - PADDING * 2;
  const availableH = VIEW_HEIGHT - PADDING * 2;
  const scale = Math.min(availableW / widthCm, availableH / lengthCm);

  const rectW = widthCm * scale;
  const rectH = lengthCm * scale;
  const x = (VIEW_WIDTH - rectW) / 2;
  const y = (VIEW_HEIGHT - rectH) / 2;

  const hasHandle = !!handleModelName;
  // Recorte/alça esquemático saindo da borda superior (curta), só ilustrativo.
  const handleW = Math.min(rectW * 0.3, 36);
  const handleH = 10;
  const handleX = x + rectW / 2 - handleW / 2;
  const handleY = y - handleH;

  return (
    <div className="rounded-brand bg-bg-muted p-3">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="mx-auto h-[200px] w-full max-w-[280px]"
        role="img"
        aria-label={`Esboço da peça: ${widthCm} por ${lengthCm} centímetros${hasHandle ? `, com ${handleModelName}` : ""}`}
      >
        {hasHandle && (
          <rect
            x={handleX}
            y={handleY}
            width={handleW}
            height={handleH}
            rx={3}
            className="fill-accent/40 stroke-accent"
            strokeWidth={1}
          />
        )}

        <rect
          x={x}
          y={y}
          width={rectW}
          height={rectH}
          rx={4}
          className="fill-white stroke-primary"
          strokeWidth={1.5}
        />

        {/* Largura, embaixo */}
        <text
          x={VIEW_WIDTH / 2}
          y={y + rectH + 18}
          textAnchor="middle"
          className="fill-text-muted text-[11px]"
        >
          {widthCm} cm
        </text>

        {/* Comprimento, à direita, na vertical */}
        <text
          x={x + rectW + 16}
          y={VIEW_HEIGHT / 2}
          textAnchor="middle"
          className="fill-text-muted text-[11px]"
          transform={`rotate(90 ${x + rectW + 16} ${VIEW_HEIGHT / 2})`}
        >
          {lengthCm} cm
        </text>

        {hasHandle && (
          <text
            x={VIEW_WIDTH / 2}
            y={handleY - 6}
            textAnchor="middle"
            className="fill-accent text-[10px] font-medium"
          >
            {handleModelName}
          </text>
        )}
      </svg>
      {heightCm ? (
        <p className="mt-1 text-center text-xs text-text-muted">
          Espessura: {heightCm} cm
        </p>
      ) : null}
    </div>
  );
}
