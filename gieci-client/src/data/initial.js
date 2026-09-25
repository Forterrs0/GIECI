const HORA = 3600000;
const AGORA = Date.now();
export const ARMARIOS_INICIAIS = [
  { id: "arm-1", name: "Estoque Seco" },
  { id: "arm-2", name: "Câmara Fria 1" },
];
export const PRATELEIRAS_INICIAIS = [
  { id: "prat-1", name: "Prateleira A1", armarioId: "arm-1" },
  { id: "prat-2", name: "Prateleira A2", armarioId: "arm-1" },
  { id: "prat-3", name: "Prateleira A3", armarioId: "arm-1" },
  { id: "prat-4", name: "Prateleira B2", armarioId: "arm-2" },
  { id: "prat-5", name: "Bancada de Temperos", armarioId: null },
];
export const PRODUTOS_INICIAIS = [
  {
    id: 1,
    name: "Arroz Branco Tipo 1",
    category: "Grãos e Cereais",
    prateleiraId: "prat-1",
    unitWeight: 5000,
    currentWeight: 45000,
    minQuantity: 4,
  },
  {
    id: 2,
    name: "Filé de Frango Congelado",
    category: "Congelados",
    prateleiraId: "prat-4",
    unitWeight: 2000,
    currentWeight: 8000,
    minQuantity: 6,
  },
  {
    id: 3,
    name: "Óleo de Soja",
    category: "Outros",
    prateleiraId: "prat-3",
    unitWeight: 900,
    currentWeight: 900,
    minQuantity: 5,
  },
  {
    id: 4,
    name: "Sal Refinado",
    category: "Temperos e Condimentos",
    prateleiraId: "prat-2",
    unitWeight: 1000,
    currentWeight: 12000,
    minQuantity: 3,
  },
];
export const HISTORICO_INICIAL = [
  {
    id: 1,
    productId: 3,
    productName: "Óleo de Soja",
    type: "saida",
    quantityChanged: 1,
    weightBefore: 1800,
    weightAfter: 900,
    timestamp: AGORA - HORA * 1,
  },
  {
    id: 2,
    productId: 2,
    productName: "Filé de Frango Congelado",
    type: "saida",
    quantityChanged: 2,
    weightBefore: 12000,
    weightAfter: 8000,
    timestamp: AGORA - HORA * 3,
  },
  {
    id: 3,
    productId: 1,
    productName: "Arroz Branco Tipo 1",
    type: "entrada",
    quantityChanged: 5,
    weightBefore: 20000,
    weightAfter: 45000,
    timestamp: AGORA - HORA * 20,
  },
];
