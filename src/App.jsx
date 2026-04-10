
import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Calendar,
  Clock3,
  FileText,
  LayoutDashboard,
  Package,
  PackagePlus,
  PackageMinus,
  ClipboardList,
  Tags,
  Search,
  Upload,
  Download,
  Building2,
  Users,
  Wrench,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase, isSupabaseConfigured } from "./supabase";

const LOGO_SRC = "/logo-nero.png";

const LOCAL_DATA_KEY = "nero_local_data_v2";
const LOCAL_SELECTED_OBRA_KEY = "nero_local_selected_obra_v2";
const LOCAL_ONLINE_MODE_KEY = "nero_online_mode_v2";


const DEFAULT_STOCK_CATEGORIES = [
  {
    "name": "Materiais de Construção",
    "prefix": "MC"
  },
  {
    "name": "Tintas e Complementos",
    "prefix": "TI"
  },
  {
    "name": "Louças e Metais",
    "prefix": "LM"
  },
  {
    "name": "Hidráulica",
    "prefix": "HI"
  },
  {
    "name": "Fixação",
    "prefix": "FX"
  },
  {
    "name": "Drywall e Isolamento",
    "prefix": "DR"
  },
  {
    "name": "Adesivos e Selantes",
    "prefix": "AD"
  },
  {
    "name": "Pisos e Revestimentos",
    "prefix": "PS"
  },
  {
    "name": "Ferramentas",
    "prefix": "FE"
  },
  {
    "name": "EPIs",
    "prefix": "EP"
  },
  {
    "name": "Uniformes",
    "prefix": "UN"
  },
  {
    "name": "Acessibilidade",
    "prefix": "AC"
  },
  {
    "name": "Ferramentas e Pintura",
    "prefix": "FER"
  },
  {
    "name": "Revestimento e Nivelamento",
    "prefix": "REV"
  },
  {
    "name": "Adesivos e Vedação",
    "prefix": "ADE"
  },
  {
    "name": "Iluminação e Elétrica",
    "prefix": "ELE"
  },
  {
    "name": "Tomadas, Conduletes e Caixas",
    "prefix": "TOM"
  },
  {
    "name": "Materiais Gerais",
    "prefix": "GER"
  },
  {
    "name": "Preparação de Superfície",
    "prefix": "PRE"
  },
  {
    "name": "Fitas",
    "prefix": "FIT"
  },
  {
    "name": "Alvenaria",
    "prefix": "AL"
  }
];

const DEFAULT_STOCK_CATALOG = [
  {
    "code": "MC-001",
    "name": "Argamassa 12kg Argalit",
    "category": "Materiais de Construção",
    "prefix": "MC"
  },
  {
    "code": "MC-002",
    "name": "Argamassa 20kg Argalit",
    "category": "Materiais de Construção",
    "prefix": "MC"
  },
  {
    "code": "MC-003",
    "name": "Argamassa AC3",
    "category": "Materiais de Construção",
    "prefix": "MC"
  },
  {
    "code": "MC-004",
    "name": "Argamassa C3",
    "category": "Materiais de Construção",
    "prefix": "MC"
  },
  {
    "code": "MC-005",
    "name": "Cimento poty cpII 50kg",
    "category": "Materiais de Construção",
    "prefix": "MC"
  },
  {
    "code": "MC-006",
    "name": "Massa acrílica 20kg Argalit",
    "category": "Materiais de Construção",
    "prefix": "MC"
  },
  {
    "code": "MC-007",
    "name": "Massa Corrida PVA 23kg",
    "category": "Materiais de Construção",
    "prefix": "MC"
  },
  {
    "code": "MC-008",
    "name": "Massa de Reajunte Drywall 25kg",
    "category": "Materiais de Construção",
    "prefix": "MC"
  },
  {
    "code": "MC-009",
    "name": "Massa Maxcryl 25kg",
    "category": "Materiais de Construção",
    "prefix": "MC"
  },
  {
    "code": "MC-010",
    "name": "Fundo Preparador de Paredes 18L",
    "category": "Materiais de Construção",
    "prefix": "MC"
  },
  {
    "code": "MC-011",
    "name": "Texturalit 23kg",
    "category": "Materiais de Construção",
    "prefix": "MC"
  },
  {
    "code": "TI-001",
    "name": "Aditivo Acrílico HEM-1135 20L",
    "category": "Tintas e Complementos",
    "prefix": "TI"
  },
  {
    "code": "TI-002",
    "name": "Aditivo Acrílico HEM-1144 20L",
    "category": "Tintas e Complementos",
    "prefix": "TI"
  },
  {
    "code": "TI-003",
    "name": "Thinner 300ml",
    "category": "Tintas e Complementos",
    "prefix": "TI"
  },
  {
    "code": "TI-004",
    "name": "Tinta Coral Verde Artesão",
    "category": "Tintas e Complementos",
    "prefix": "TI"
  },
  {
    "code": "TI-005",
    "name": "Tinta Coral Bege Cevada",
    "category": "Tintas e Complementos",
    "prefix": "TI"
  },
  {
    "code": "TI-006",
    "name": "Tinta Coral Floresta Negra",
    "category": "Tintas e Complementos",
    "prefix": "TI"
  },
  {
    "code": "TI-007",
    "name": "Suvinil Rende & Cobre 18L Branco",
    "category": "Tintas e Complementos",
    "prefix": "TI"
  },
  {
    "code": "LM-001",
    "name": "Bacia acoplada Span Round",
    "category": "Louças e Metais",
    "prefix": "LM"
  },
  {
    "code": "LM-002",
    "name": "Vaso Acoplado Vertis Total Clean",
    "category": "Louças e Metais",
    "prefix": "LM"
  },
  {
    "code": "LM-003",
    "name": "Lavatório Flox Branco",
    "category": "Louças e Metais",
    "prefix": "LM"
  },
  {
    "code": "LM-004",
    "name": "Coluna Suspensa Flox/Primula/Lirio",
    "category": "Louças e Metais",
    "prefix": "LM"
  },
  {
    "code": "LM-005",
    "name": "Cuba Apoio 410x310 Branco",
    "category": "Louças e Metais",
    "prefix": "LM"
  },
  {
    "code": "LM-006",
    "name": "Cuba Semi Encaixe 40cm",
    "category": "Louças e Metais",
    "prefix": "LM"
  },
  {
    "code": "LM-007",
    "name": "Torneira Bica Baixa Automática",
    "category": "Louças e Metais",
    "prefix": "LM"
  },
  {
    "code": "LM-008",
    "name": "Torneira Cozinha Flex Plus",
    "category": "Louças e Metais",
    "prefix": "LM"
  },
  {
    "code": "LM-009",
    "name": "Torneira Lavatório Automática Celite",
    "category": "Louças e Metais",
    "prefix": "LM"
  },
  {
    "code": "LM-010",
    "name": "Torneira Lavatório Spot",
    "category": "Louças e Metais",
    "prefix": "LM"
  },
  {
    "code": "LM-011",
    "name": "Torneira Jardim",
    "category": "Louças e Metais",
    "prefix": "LM"
  },
  {
    "code": "LM-012",
    "name": "Sifão Lavatório",
    "category": "Louças e Metais",
    "prefix": "LM"
  },
  {
    "code": "LM-013",
    "name": "Sifão Extensivo",
    "category": "Louças e Metais",
    "prefix": "LM"
  },
  {
    "code": "LM-014",
    "name": "Válvula Escapamento",
    "category": "Louças e Metais",
    "prefix": "LM"
  },
  {
    "code": "LM-015",
    "name": "Válvula DN32",
    "category": "Louças e Metais",
    "prefix": "LM"
  },
  {
    "code": "LM-016",
    "name": "Registro gaveta",
    "category": "Louças e Metais",
    "prefix": "LM"
  },
  {
    "code": "LM-017",
    "name": "Acabamento Registro",
    "category": "Louças e Metais",
    "prefix": "LM"
  },
  {
    "code": "HI-001",
    "name": "Base registro DN20",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "HI-002",
    "name": "Ligação flexível inox",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "HI-003",
    "name": "Mangueira de incêndio",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "HI-004",
    "name": "Tubo de 32 água fria",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "HI-005",
    "name": "Tubo de 40 água fria",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "HI-006",
    "name": "T de 40 Água fria",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "HI-007",
    "name": "T de 32 Água fria",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "HI-008",
    "name": "T 32 / 25 Água fria",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "HI-009",
    "name": "Curva 32 água fria",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "HI-010",
    "name": "Redução de 32/25 Água fria",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "HI-011",
    "name": "Joelho de 32 Água fria",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "HI-012",
    "name": "luva de 40 Água fria",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "HI-013",
    "name": "Luva de 32 Água fria",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "HI-014",
    "name": "tubo de 75 esgoto",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "HI-015",
    "name": "Joelho de 75 esgoto",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "HI-016",
    "name": "Redução 50/40 esgoto",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "HI-017",
    "name": "Luva de 50 esgoto",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "HI-018",
    "name": "Junção de 40 esgoto",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "HI-019",
    "name": "Junção de 50 esgoto",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "HI-020",
    "name": "Luva de 75 esgoto",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "HI-021",
    "name": "T de 50 esgoto",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "HI-022",
    "name": "Luva de 100 esgoto",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "HI-023",
    "name": "Joelho de 100 esgoto",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "HI-024",
    "name": "Curva de 100 esgoto",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "EL-019",
    "name": "Placa 4x2 1 posto",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "EL-020",
    "name": "Placa 4x4 1+1",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "EL-021",
    "name": "Placa 4x2 2 postos",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "EL-022",
    "name": "Placa 4x2 3 postos",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "EL-023",
    "name": "Placa cega 4x2",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "EL-024",
    "name": "Placa cega 4x4",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "EL-025",
    "name": "Suporte 4x2",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "EL-026",
    "name": "Suporte 4x4",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "EL-028",
    "name": "Cabo 6,00 mm Branco",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "EL-029",
    "name": "Cabo 4,00 mm Amarelo",
    "category": "Hidráulica",
    "prefix": "HI"
  },
  {
    "code": "FX-001",
    "name": "Bucha nº6",
    "category": "Fixação",
    "prefix": "FX"
  },
  {
    "code": "FX-002",
    "name": "Parafuso 3,5x25",
    "category": "Fixação",
    "prefix": "FX"
  },
  {
    "code": "FX-003",
    "name": "Parafuso 4,0x45",
    "category": "Fixação",
    "prefix": "FX"
  },
  {
    "code": "FX-004",
    "name": "Parafuso 4,5x40",
    "category": "Fixação",
    "prefix": "FX"
  },
  {
    "code": "FX-005",
    "name": "Parafuso GN25",
    "category": "Fixação",
    "prefix": "FX"
  },
  {
    "code": "DR-001",
    "name": "Placa Drywall acústica",
    "category": "Drywall e Isolamento",
    "prefix": "DR"
  },
  {
    "code": "DR-002",
    "name": "Lã termo acústica",
    "category": "Drywall e Isolamento",
    "prefix": "DR"
  },
  {
    "code": "DR-003",
    "name": "HEM-VÉU",
    "category": "Drywall e Isolamento",
    "prefix": "DR"
  },
  {
    "code": "DR-004",
    "name": "Fita papel metálica",
    "category": "Drywall e Isolamento",
    "prefix": "DR"
  },
  {
    "code": "DR-005",
    "name": "Fita microperfurada",
    "category": "Drywall e Isolamento",
    "prefix": "DR"
  },
  {
    "code": "DR-006",
    "name": "Fita alumínio",
    "category": "Drywall e Isolamento",
    "prefix": "DR"
  },
  {
    "code": "DR-007",
    "name": "Fita fibra de vidro",
    "category": "Drywall e Isolamento",
    "prefix": "DR"
  },
  {
    "code": "DR-008",
    "name": "Tabica branca",
    "category": "Drywall e Isolamento",
    "prefix": "DR"
  },
  {
    "code": "DR-009",
    "name": "Lona elevador",
    "category": "Drywall e Isolamento",
    "prefix": "DR"
  },
  {
    "code": "DR-010",
    "name": "Alçapão Clicado com Tampa 40x40cm",
    "category": "Drywall e Isolamento",
    "prefix": "DR"
  },
  {
    "code": "DR-011",
    "name": "Montante 70x0,5 x3000 mm",
    "category": "Drywall e Isolamento",
    "prefix": "DR"
  },
  {
    "code": "AD-001",
    "name": "Galverette A",
    "category": "Adesivos e Selantes",
    "prefix": "AD"
  },
  {
    "code": "AD-002",
    "name": "Galverette B",
    "category": "Adesivos e Selantes",
    "prefix": "AD"
  },
  {
    "code": "AD-003",
    "name": "Muzafan 39",
    "category": "Adesivos e Selantes",
    "prefix": "AD"
  },
  {
    "code": "AD-004",
    "name": "Espuma expansiva MP90",
    "category": "Adesivos e Selantes",
    "prefix": "AD"
  },
  {
    "code": "AD-005",
    "name": "Tubos cola acabamento",
    "category": "Adesivos e Selantes",
    "prefix": "AD"
  },
  {
    "code": "PS-001",
    "name": "Piso vinílico 2,30",
    "category": "Pisos e Revestimentos",
    "prefix": "PS"
  },
  {
    "code": "PS-002",
    "name": "Piso vinílico 90x90",
    "category": "Pisos e Revestimentos",
    "prefix": "PS"
  },
  {
    "code": "FE-001",
    "name": "Rolo de tinta 23cm",
    "category": "Ferramentas",
    "prefix": "FE"
  },
  {
    "code": "FE-002",
    "name": "Suporte rolo 23cm",
    "category": "Ferramentas",
    "prefix": "FE"
  },
  {
    "code": "EP-001",
    "name": "Bota nº 40",
    "category": "EPIs",
    "prefix": "EP"
  },
  {
    "code": "EP-002",
    "name": "Capacete amarelo",
    "category": "EPIs",
    "prefix": "EP"
  },
  {
    "code": "EP-003",
    "name": "Capa de chuva",
    "category": "EPIs",
    "prefix": "EP"
  },
  {
    "code": "EP-004",
    "name": "Luva",
    "category": "EPIs",
    "prefix": "EP"
  },
  {
    "code": "EP-005",
    "name": "Luva látex GG",
    "category": "EPIs",
    "prefix": "EP"
  },
  {
    "code": "EP-006",
    "name": "Máscara",
    "category": "EPIs",
    "prefix": "EP"
  },
  {
    "code": "EP-007",
    "name": "Óculos de proteção",
    "category": "EPIs",
    "prefix": "EP"
  },
  {
    "code": "EP-008",
    "name": "Protetor auricular",
    "category": "EPIs",
    "prefix": "EP"
  },
  {
    "code": "UN-001",
    "name": "Calça P",
    "category": "Uniformes",
    "prefix": "UN"
  },
  {
    "code": "UN-002",
    "name": "Calça G",
    "category": "Uniformes",
    "prefix": "UN"
  },
  {
    "code": "UN-003",
    "name": "Calça GG",
    "category": "Uniformes",
    "prefix": "UN"
  },
  {
    "code": "UN-004",
    "name": "Camisa G",
    "category": "Uniformes",
    "prefix": "UN"
  },
  {
    "code": "UN-005",
    "name": "Camisa GG",
    "category": "Uniformes",
    "prefix": "UN"
  },
  {
    "code": "AC-001",
    "name": "Barra apoio 70cm",
    "category": "Acessibilidade",
    "prefix": "AC"
  },
  {
    "code": "AC-002",
    "name": "Barra apoio 80cm",
    "category": "Acessibilidade",
    "prefix": "AC"
  },
  {
    "code": "FER-001",
    "name": "Trinchão",
    "category": "Ferramentas e Pintura",
    "prefix": "FER"
  },
  {
    "code": "FER-002",
    "name": "Trinchão (cabo quebrado) Tigre",
    "category": "Ferramentas e Pintura",
    "prefix": "FER"
  },
  {
    "code": "FER-003",
    "name": "Rolo Industrial Atlas",
    "category": "Ferramentas e Pintura",
    "prefix": "FER"
  },
  {
    "code": "FER-004",
    "name": "Espuma Multiuso Atlas",
    "category": "Ferramentas e Pintura",
    "prefix": "FER"
  },
  {
    "code": "FER-005",
    "name": "Lixa 180 Tigre",
    "category": "Ferramentas e Pintura",
    "prefix": "FER"
  },
  {
    "code": "FER-006",
    "name": "Lixa 220 Tigre",
    "category": "Ferramentas e Pintura",
    "prefix": "FER"
  },
  {
    "code": "FER-007",
    "name": "Lixa 180 Norton",
    "category": "Ferramentas e Pintura",
    "prefix": "FER"
  },
  {
    "code": "FER-008",
    "name": "Lixa 180 Vonder",
    "category": "Ferramentas e Pintura",
    "prefix": "FER"
  },
  {
    "code": "FER-009",
    "name": "Lixa 180 3M",
    "category": "Ferramentas e Pintura",
    "prefix": "FER"
  },
  {
    "code": "REV-001",
    "name": "Espaçador Nivelador Slim 2,0 mm",
    "category": "Revestimento e Nivelamento",
    "prefix": "REV"
  },
  {
    "code": "REV-002",
    "name": "Cunha Nivelador Cortag",
    "category": "Revestimento e Nivelamento",
    "prefix": "REV"
  },
  {
    "code": "REV-003",
    "name": "Espaçador Nivelador Slim 3,0 mm",
    "category": "Revestimento e Nivelamento",
    "prefix": "REV"
  },
  {
    "code": "REV-004",
    "name": "Espaçador Nivelador Estreito 2 mm",
    "category": "Revestimento e Nivelamento",
    "prefix": "REV"
  },
  {
    "code": "REV-005",
    "name": "Reajunte CZ Platina",
    "category": "Revestimento e Nivelamento",
    "prefix": "REV"
  },
  {
    "code": "ADE-001",
    "name": "Adesivo Plástico Amanco",
    "category": "Adesivos e Vedação",
    "prefix": "ADE"
  },
  {
    "code": "ADE-002",
    "name": "Adesivo para pisos vinílicos Quartzolit",
    "category": "Adesivos e Vedação",
    "prefix": "ADE"
  },
  {
    "code": "ADE-003",
    "name": "Fita Teflon Noah",
    "category": "Adesivos e Vedação",
    "prefix": "ADE"
  },
  {
    "code": "ADE-004",
    "name": "Fita Dupla Face",
    "category": "Adesivos e Vedação",
    "prefix": "ADE"
  },
  {
    "code": "ELE-001",
    "name": "Lâmpada LED Tubular T8 BYD",
    "category": "Iluminação e Elétrica",
    "prefix": "ELE"
  },
  {
    "code": "ELE-002",
    "name": "Lâmpada LED Taschibra",
    "category": "Iluminação e Elétrica",
    "prefix": "ELE"
  },
  {
    "code": "ELE-003",
    "name": "Luminária LED 24W",
    "category": "Iluminação e Elétrica",
    "prefix": "ELE"
  },
  {
    "code": "ELE-004",
    "name": "Painel Embutir Quadrado Avant",
    "category": "Iluminação e Elétrica",
    "prefix": "ELE"
  },
  {
    "code": "ELE-005",
    "name": "Painel Embutir Redondo",
    "category": "Iluminação e Elétrica",
    "prefix": "ELE"
  },
  {
    "code": "ELE-006",
    "name": "Spot LED 5W",
    "category": "Iluminação e Elétrica",
    "prefix": "ELE"
  },
  {
    "code": "ELE-007",
    "name": "Sensor de Presença",
    "category": "Iluminação e Elétrica",
    "prefix": "ELE"
  },
  {
    "code": "TOM-001",
    "name": "Condulete Wetzel",
    "category": "Tomadas, Conduletes e Caixas",
    "prefix": "TOM"
  },
  {
    "code": "TOM-002",
    "name": "Condulete XPW-20 1T",
    "category": "Tomadas, Conduletes e Caixas",
    "prefix": "TOM"
  },
  {
    "code": "TOM-003",
    "name": "Condulete XPW-20 3T",
    "category": "Tomadas, Conduletes e Caixas",
    "prefix": "TOM"
  },
  {
    "code": "TOM-004",
    "name": "Tomada 2P+T",
    "category": "Tomadas, Conduletes e Caixas",
    "prefix": "TOM"
  },
  {
    "code": "TOM-005",
    "name": "Tomada 20A Sob Condulete",
    "category": "Tomadas, Conduletes e Caixas",
    "prefix": "TOM"
  },
  {
    "code": "TOM-006",
    "name": "Caixa Drywall 4x2",
    "category": "Tomadas, Conduletes e Caixas",
    "prefix": "TOM"
  },
  {
    "code": "TOM-007",
    "name": "Caixa de Passagem",
    "category": "Tomadas, Conduletes e Caixas",
    "prefix": "TOM"
  },
  {
    "code": "GER-001",
    "name": "Saco para entulho",
    "category": "Materiais Gerais",
    "prefix": "GER"
  },
  {
    "code": "GER-002",
    "name": "Tábuas",
    "category": "Materiais Gerais",
    "prefix": "GER"
  },
  {
    "code": "GER-003",
    "name": "Tanque Plástico Astra",
    "category": "Materiais Gerais",
    "prefix": "GER"
  },
  {
    "code": "PRE-001",
    "name": "Embaia Prepara Pro Quartzolit",
    "category": "Preparação de Superfície",
    "prefix": "PRE"
  },
  {
    "code": "FIT-001",
    "name": "Fita Crepe",
    "category": "Fitas",
    "prefix": "FIT"
  },
  {
    "code": "FIT-002",
    "name": "Fita Isolante 3M",
    "category": "Fitas",
    "prefix": "FIT"
  },
  {
    "code": "FIT-003",
    "name": "Fita Zebrada",
    "category": "Fitas",
    "prefix": "FIT"
  },
  {
    "code": "AL-001",
    "name": "Bloco",
    "category": "Alvenaria",
    "prefix": "AL"
  }
];



function readStoredLocalData() {
  if (typeof window === "undefined") return initialData;
  try {
    const raw = window.localStorage.getItem(LOCAL_DATA_KEY);
    if (!raw) return initialData;
    const parsed = JSON.parse(raw);
    if (!parsed?.obras) return initialData;
    return {
      ...initialData,
      ...parsed,
      maintenance: (parsed.maintenance || []).map((item) => ({ ...item, observacao: item.observacao || "" })),
      stockCategories: Array.isArray(parsed.stockCategories) && parsed.stockCategories.length ? parsed.stockCategories : DEFAULT_STOCK_CATEGORIES,
      stockCatalog: Array.isArray(parsed.stockCatalog) && parsed.stockCatalog.length ? parsed.stockCatalog : DEFAULT_STOCK_CATALOG,
      stockMovements: parsed.stockMovements || [],
    };
  } catch {
    return initialData;
  }
}

function readStoredSelectedObra() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(LOCAL_SELECTED_OBRA_KEY) || "";
}

function readStoredOnlineMode() {
  if (typeof window === "undefined") return isSupabaseConfigured;
  const raw = window.localStorage.getItem(LOCAL_ONLINE_MODE_KEY);
  if (raw === null) return isSupabaseConfigured;
  return raw === "true";
}


const initialData = {
  obras: [
    { id: 101, nome: "Obra Principal", cliente: "NERO Construções", local: "Salvador/BA", status: "Ativa", dataInicio: "2026-04-01", observacao: "" },
  ],
  companies: [
    { id: 1, name: "NERO Construções", city: "Salvador/BA" },
    { id: 2, name: "Obra Shopping Atlântico", city: "Lauro de Freitas/BA" },
  ],
  roles: [
    { id: 1, companyId: 1, name: "Mestre de Obras" },
    { id: 2, companyId: 1, name: "Engenheiro Civil" },
    { id: 3, companyId: 1, name: "Almoxarife" },
    { id: 4, companyId: 2, name: "Técnico de Segurança" },
    { id: 5, companyId: 2, name: "Eletricista" },
  ],
  maintenance: [],
  stock: [],
  stockMovements: [],
  stockCategories: DEFAULT_STOCK_CATEGORIES,
  stockCatalog: DEFAULT_STOCK_CATALOG,
  attendance: [],
  history: [],
};

const pages = {
  dashboard: { label: "Controles NERO Construções", icon: LayoutDashboard },
  stock: { label: "Almoxarifado", icon: Package },
  maintenance: { label: "Manutenções", icon: Wrench },
  attendance: { label: "Presença", icon: Users },
  history: { label: "Histórico", icon: Calendar },
};

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatDateBR(isoDate) {
  if (!isoDate) return "-";
  const [year, month, day] = String(isoDate).slice(0, 10).split("-");
  if (!year || !month || !day) return "-";
  return `${day}/${month}/${year}`;
}

function formatCurrencyBR(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

function getTodayBR() {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
}

function getTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDateTimeBRNoSeconds() {
  const now = new Date();
  const date = now.toLocaleDateString("pt-BR");
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return `${date} ${time}`;
}

function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}


function normalizePrefix(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
}

function buildNextMaterialCode(prefix, catalog) {
  const cleanPrefix = normalizePrefix(prefix);
  const maxSeq = catalog
    .filter((item) => normalizePrefix(item.prefix) === cleanPrefix)
    .map((item) => Number(String(item.code || "").split("-")[1] || 0))
    .reduce((acc, value) => Math.max(acc, value), 0);

  return `${cleanPrefix}-${String(maxSeq + 1).padStart(3, "0")}`;
}

function getStockItemCode(item, catalog) {
  if (!item) return "";
  if (item.code) return item.code;
  const matched = catalog.find(
    (catalogItem) =>
      String(catalogItem.name).trim().toLowerCase() === String(item.item || "").trim().toLowerCase() &&
      String(catalogItem.category).trim().toLowerCase() === String(item.category || "").trim().toLowerCase()
  );
  return matched?.code || "";
}

function getLatestStockMovement(itemId, movements) {
  return movements
    .filter((movement) => String(movement.itemId) === String(itemId))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || null;
}


function addDaysISO(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function diffDaysFromToday(dateString) {
  if (!dateString) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateString}T00:00:00`);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((today - target) / (1000 * 60 * 60 * 24));
}

function getMaintenanceStatus(item) {
  if (item.deliveryDate) return "Entregue";
  if (item.realizationDate) return "Em execução";
  if (item.limitDate && diffDaysFromToday(item.limitDate) > 0) return "Atrasado";
  return "No prazo";
}

function getDelayIndicator(item) {
  if (item.deliveryDate || !item.limitDate) return "-";
  const diff = diffDaysFromToday(item.limitDate);
  return diff > 0 ? `${diff} dia${diff > 1 ? "s" : ""}` : "-";
}

async function loadImageDataUrl(src) {
  const response = await fetch(src);
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function Card({ children, className = "" }) {
  return <div className={cn("rounded-[28px] border border-slate-200 bg-white shadow-sm", className)}>{children}</div>;
}

function CardHeader({ title, description, right }) {
  return (
    <div className="p-5 border-b border-slate-100 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h3 className="text-lg font-bold tracking-tight text-slate-900">{title}</h3>
        {description ? <p className="text-sm text-slate-500 mt-1">{description}</p> : null}
      </div>
      {right}
    </div>
  );
}

function Button({ children, variant = "primary", className = "", ...props }) {
  const styles = {
    primary: "bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800",
    outline: "bg-white text-slate-700 border-slate-300 hover:bg-emerald-50 hover:border-emerald-200",
    danger: "bg-rose-600 text-white border-rose-600 hover:bg-rose-700",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 h-11 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Badge({ children, className = "" }) {
  return <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium", className)}>{children}</span>;
}

function Input({ className = "", ...props }) {
  return <input className={cn("w-full rounded-2xl border border-slate-300 bg-white px-4 h-11 text-sm outline-none focus:border-emerald-500", className)} {...props} />;
}

function Textarea({ className = "", ...props }) {
  return <textarea className={cn("w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 min-h-[120px] resize-y", className)} {...props} />;
}

function SelectField({ value, onChange, options, className = "" }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cn("w-full rounded-2xl border border-slate-300 bg-white px-4 h-11 text-sm outline-none focus:border-emerald-500", className)}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl rounded-[30px] border border-slate-200 bg-white shadow-2xl max-h-[92vh] overflow-auto">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button className="rounded-xl p-2 hover:bg-slate-100" onClick={onClose}>×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function LogoBlock() {
  return (
    <div className="flex items-center gap-4">
      <div className="h-20 w-20 rounded-[28px] overflow-hidden bg-white shadow-md border border-emerald-100 flex items-center justify-center">
        <img
          src={LOGO_SRC}
          alt="Logo NERO"
          className="h-full w-full object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const fallback = e.currentTarget.nextElementSibling;
            if (fallback) fallback.style.display = "flex";
          }}
        />
        <div className="hidden h-full w-full items-center justify-center bg-gradient-to-r from-emerald-700 to-emerald-800 text-white text-3xl font-bold">N</div>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Sistema Web</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-none mt-2">NERO</h1>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-none mt-1">Construções</h2>
      </div>
    </div>
  );
}

function Sidebar({ currentPage, setCurrentPage }) {
  const sidebarPages = ["dashboard", "stock", "maintenance", "attendance", "history"];
  return (
    <aside className="hidden md:flex md:w-[272px] lg:w-[288px] border-r border-slate-200 bg-gradient-to-b from-slate-50 to-slate-200 flex-col">
      <div className="px-6 py-7 border-b border-slate-200 bg-gradient-to-b from-emerald-50/70 to-white">
        <LogoBlock />
      </div>
      <nav className="flex-1 p-5 space-y-3">
        {sidebarPages.map((key) => {
          const item = pages[key];
          const Icon = item.icon;
          const active = currentPage === key;
          return (
            <button
              key={key}
              onClick={() => setCurrentPage(key)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-4 rounded-[24px] transition-all text-left border",
                active ? "bg-gradient-to-r from-emerald-700 to-emerald-800 text-white border-emerald-800 shadow-md" : "bg-white text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 border-slate-200"
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="font-semibold text-[17px]">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function ConnectionBadge({ configured, onlineMode }) {
  if (!configured) return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Supabase não configurado</Badge>;
  if (!onlineMode) return <Badge className="bg-slate-100 text-slate-700 border-slate-300">Modo local</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Modo online</Badge>;
}

function Topbar({
  currentPage,
  setCurrentPage,
  onReset,
  onCloseDay,
  obraId,
  setObraId,
  obras,
  connectionBadge,
  onOpenObras,
  onExportBackup,
  onImportBackupClick,
}) {
  const mobilePages = ["dashboard", "stock", "maintenance", "attendance", "history"];
  return (
    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="px-4 md:px-6 xl:px-7 py-4 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-[2.2rem] md:text-[2.75rem] font-extrabold tracking-tight text-slate-900">NERO CONSTRUÇÕES</h2>
            <div className="mt-3 grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto] gap-3 max-w-5xl">
              <SelectField
                value={String(obraId || "")}
                onChange={(value) => setObraId(value)}
                options={obras.length ? obras.map((obra) => ({ value: String(obra.id), label: obra.nome })) : [{ value: "", label: "Sem obras cadastradas" }]}
              />
              <Button variant="outline" onClick={onOpenObras}><Building2 className="h-4 w-4" /> Obras</Button>
              <Button variant="outline" onClick={onExportBackup}><Download className="h-4 w-4" /> Exportar backup</Button>
              <Button variant="outline" onClick={onImportBackupClick}><Upload className="h-4 w-4" /> Importar backup</Button>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 flex-wrap justify-end">
            {connectionBadge}
            <Badge className="bg-white text-slate-700 border-slate-300 text-base px-5 h-11 rounded-full"><Calendar className="h-4 w-4 mr-2" /> {getTodayBR()}</Badge>
            {currentPage === "dashboard" ? (
              <>
                <Button variant="outline" className="rounded-full px-6 h-12" onClick={onCloseDay}>Fechar dia</Button>
                <Button variant="outline" className="rounded-full px-7 h-12" onClick={onReset}>Resetar base</Button>
              </>
            ) : null}
          </div>
        </div>
        <div className="md:hidden grid grid-cols-2 gap-2">
          {mobilePages.map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={cn(
                "h-11 rounded-2xl border text-sm font-medium transition-colors",
                currentPage === page ? "bg-emerald-800 text-white border-emerald-800" : "bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200"
              )}
            >
              {pages[page].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function HomeStatCard({ title, value, subtitle, icon: Icon, alert, valueClassName = "" }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[26px] border border-slate-200 bg-white px-5 py-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg",
        alert && "border-rose-200"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-slate-100/35 pointer-events-none" />
      <div
        className={cn(
          "absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-2xl shadow-inner",
          alert ? "bg-rose-100 text-rose-700" : "bg-emerald-50 text-emerald-700"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="relative min-h-[148px] pr-16 flex flex-col justify-end">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <p
            className={cn(
              "mt-3 text-[1.8rem] md:text-[2.2rem] font-bold leading-none tracking-tight text-slate-900",
              valueClassName
            )}
          >
            {value}
          </p>
          <p className="mt-3 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({ icon: Icon, title, subtitle, onClick }) {
  return (
    <button onClick={onClick} className="text-left rounded-[24px] border border-slate-200 p-4 transition-all duration-300 bg-white hover:-translate-y-0.5 hover:shadow-lg hover:border-emerald-300 hover:bg-emerald-50/40">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-slate-100 text-slate-700"><Icon className="h-5 w-5" /></div>
        <div className="min-w-0"><p className="font-semibold text-slate-900">{title}</p><p className="text-sm text-slate-500 mt-1">{subtitle}</p></div>
      </div>
    </button>
  );
}

function ReturnHomeButton({ onClick }) {
  return <Button variant="outline" onClick={onClick}><ArrowLeft className="h-4 w-4" /> Página inicial</Button>;
}


function DashboardPage({ data, obraAtual, historyCountForObra, onGoToStock, onGoToMaintenance, onGoToAttendance, onGoToHistory, onExportCurrentPdf, onCloseDay }) {
  const pendingCount = data.maintenance.filter((item) => getMaintenanceStatus(item) !== "Entregue").length;
  const delayedCount = data.maintenance.filter((item) => getMaintenanceStatus(item) === "Atrasado").length;
  const deliveredCount = data.maintenance.filter((item) => getMaintenanceStatus(item) === "Entregue").length;
  const criticalStock = data.stock.filter((item) => Number(item.quantity) < Number(item.min)).length;
  const totalPresent = data.attendance.reduce((acc, item) => acc + Number(item.qty || 0), 0);
  const totalMaintenance = data.maintenance.length;
  const completionPercent = totalMaintenance ? Math.round((deliveredCount / totalMaintenance) * 100) : 0;
  const totalMaintenanceCost = data.maintenance.reduce((acc, item) => acc + Number(item.cost || 0), 0);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border border-slate-200 shadow-xl">
        <div className="bg-gradient-to-r from-slate-900 via-emerald-900 to-slate-900 p-5 md:p-6 text-white">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
              <div className="max-w-3xl">
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-200 font-semibold">Central operacional</p>
                <h3 className="text-2xl md:text-[2.1rem] font-extrabold mt-2 tracking-tight">{obraAtual?.nome || "Selecione uma obra"}</h3>
                <p className="text-sm md:text-base text-slate-200/90 mt-3">
                  Cliente: <span className="font-semibold">{obraAtual?.cliente || "-"}</span>
                </p>
                <p className="text-sm md:text-base text-slate-200/90 mt-2">
                  Local: <span className="font-semibold">{obraAtual?.local || "-"}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full xl:w-auto">
                <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3">
                  <p className="text-xs text-slate-300">Empresas</p>
                  <p className="text-xl md:text-2xl font-bold mt-1">{data.companies.length}</p>
                </div>
                <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3">
                  <p className="text-xs text-slate-300">Materiais</p>
                  <p className="text-xl md:text-2xl font-bold mt-1">{data.stock.length}</p>
                </div>
                <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3">
                  <p className="text-xs text-slate-300">OS</p>
                  <p className="text-xl md:text-2xl font-bold mt-1">{totalMaintenance}</p>
                </div>
                <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3">
                  <p className="text-xs text-slate-300">Históricos</p>
                  <p className="text-xl md:text-2xl font-bold mt-1">{historyCountForObra}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
              <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Status</p>
                    <p className="mt-1 text-sm md:text-base font-semibold text-emerald-200">{obraAtual?.status || "Ativa"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">OS abertas</p>
                    <p className="mt-1 text-sm md:text-base font-semibold">{pendingCount}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">OS entregues</p>
                    <p className="mt-1 text-sm md:text-base font-semibold">{deliveredCount}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Custo acumulado</p>
                    <p className="mt-1 text-sm md:text-base font-semibold">{formatCurrencyBR(totalMaintenanceCost)}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                    <span>Progresso das OS</span>
                    <span>{completionPercent}%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-white/15 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-300 transition-all duration-500"
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button className="h-10 rounded-xl bg-white text-slate-900 border-white hover:bg-slate-100" onClick={onExportCurrentPdf}>
                    <FileText className="h-4 w-4" /> PDF operacional
                  </Button>
                  <Button variant="outline" className="h-10 rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/30" onClick={onCloseDay}>
                    <Calendar className="h-4 w-4" /> Fechar dia
                  </Button>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Indicador executivo</p>
                {delayedCount > 0 ? (
                  <div className="mt-3 rounded-2xl border border-rose-300/30 bg-rose-200/10 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-200/15 text-rose-200">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-rose-100">Existem {delayedCount} OS atrasadas nesta obra</p>
                        <p className="mt-1 text-sm text-slate-200/80">Acompanhe os prazos para evitar impacto operacional.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-200/10 p-4">
                    <p className="text-sm font-semibold text-emerald-100">Nenhuma OS atrasada nesta obra.</p>
                    <p className="mt-1 text-sm text-slate-200/80">O cronograma está sob controle no momento.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <HomeStatCard title="Manutenções abertas" value={pendingCount} subtitle="Aguardando entrega" icon={Clock3} />
        <HomeStatCard title="Manutenções atrasadas" value={delayedCount} subtitle="Prazo ultrapassado" icon={AlertTriangle} alert={delayedCount > 0} />
        <HomeStatCard title="Itens críticos" value={criticalStock} subtitle="Abaixo do mínimo" icon={Package} alert={criticalStock > 0} />
        <HomeStatCard title="Total presente" value={totalPresent} subtitle="Equipe somada na obra" icon={Users} />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <QuickActionCard icon={Package} title="Almoxarifado" subtitle="Consulta e cadastro de materiais" onClick={onGoToStock} />
        <QuickActionCard icon={Wrench} title="Manutenções" subtitle="OS, prazo, status e atraso" onClick={onGoToMaintenance} />
        <QuickActionCard icon={Users} title="Presença" subtitle="Lançamento em lote por função" onClick={onGoToAttendance} />
        <QuickActionCard icon={Calendar} title="Histórico" subtitle="Dias fechados e PDFs" onClick={onGoToHistory} />
      </section>
    </div>
  );
}


function StockPage({
  stock,
  stockCatalog,
  stockCategories,
  stockMovements,
  search,
  setSearch,
  categoryFilter,
  setCategoryFilter,
  criticalOnly,
  setCriticalOnly,
  onBack,
  onAdd,
  onDelete,
  onMovement,
  onHistory,
  onCategories,
}) {
  const summary = {
    totalItems: stock.length,
    criticalItems: stock.filter((item) => Number(item.quantity) < Number(item.min)).length,
    totalValue: stock.reduce((acc, item) => acc + Number(item.quantity || 0) * Number(item.price || 0), 0),
    totalMovements: stockMovements.length,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Almoxarifado"
          description="Cadastro codificado por categoria, movimentações, saldo automático e histórico por item"
          right={
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={onCategories}><Tags className="h-4 w-4" /> Categorias</Button>
              <Button onClick={onAdd}><PackagePlus className="h-4 w-4" /> Novo item</Button>
              <ReturnHomeButton onClick={onBack} />
            </div>
          }
        />
      </Card>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <HomeStatCard title="Itens cadastrados" value={summary.totalItems} subtitle="Itens da obra filtrada" icon={Package} />
        <HomeStatCard title="Itens críticos" value={summary.criticalItems} subtitle="Abaixo do estoque mínimo" icon={AlertTriangle} alert={summary.criticalItems > 0} />
        <HomeStatCard title="Valor em estoque" value={formatCurrencyBR(summary.totalValue)} subtitle="Saldo x valor unitário" icon={Briefcase} valueClassName="text-[1.55rem] md:text-[1.9rem]" />
        <HomeStatCard title="Movimentações" value={summary.totalMovements} subtitle="Histórico local do almoxarifado" icon={ClipboardList} />
      </section>

      <Card>
        <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input className="pl-10" placeholder="Pesquisar por código, item ou categoria..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <SelectField
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { value: "todos", label: "Todas as categorias" },
              ...stockCategories.map((category) => ({ value: category.name, label: `${category.prefix} • ${category.name}` })),
            ]}
          />
          <Button variant={criticalOnly ? "primary" : "outline"} onClick={() => setCriticalOnly((prev) => !prev)}>
            {criticalOnly ? "Mostrando críticos" : "Somente críticos"}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {stock.length ? stock.map((item) => {
          const code = getStockItemCode(item, stockCatalog);
          const latestMovement = getLatestStockMovement(item.id, stockMovements);
          const critical = Number(item.quantity) < Number(item.min);

          return (
            <Card key={item.id} className={cn("overflow-hidden", critical ? "border-rose-200" : "")}>
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="pr-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">{item.category}</p>
                    <h3 className="text-lg font-semibold text-slate-900 mt-1">{code ? `${code} • ${item.item}` : item.item}</h3>
                    <p className="text-sm text-slate-500 mt-1">Unidade: {item.unit || "-"}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Badge className={critical ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-700 border-slate-200"}>
                      {critical ? "Estoque mínimo" : "Normal"}
                    </Badge>
                    <Button variant="outline" className="h-9 px-3 rounded-xl" onClick={() => onHistory(item)}><ClipboardList className="h-4 w-4" /> Histórico</Button>
                    <Button variant="danger" className="h-9 px-3 rounded-xl" onClick={() => onDelete(item.id)}>Excluir</Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-white border border-slate-200">
                    <p className="text-sm text-slate-500">Saldo atual</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{item.quantity} {item.unit}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-slate-200">
                    <p className="text-sm text-slate-500">Mínimo</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{item.min} {item.unit}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-slate-200">
                    <p className="text-sm text-slate-500">Nota fiscal</p>
                    <p className="font-medium text-slate-900 mt-1">{item.invoice || "-"}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-slate-200">
                    <p className="text-sm text-slate-500">Valor unitário</p>
                    <p className="font-medium text-slate-900 mt-1">{formatCurrencyBR(item.price)}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Última movimentação</p>
                  {latestMovement ? (
                    <div className="mt-2 flex flex-col gap-1 text-sm text-slate-700">
                      <span>{latestMovement.type === "entrada" ? "Entrada" : "Saída"} de {latestMovement.quantity} {item.unit} em {formatDateBR(latestMovement.date)}</span>
                      <span className="text-slate-500">{latestMovement.observacao || "Sem observação"}</span>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">Nenhuma movimentação registrada.</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" className="flex-1 min-w-[160px]" onClick={() => onMovement(item, "entrada")}><PackagePlus className="h-4 w-4" /> Entrada</Button>
                  <Button variant="outline" className="flex-1 min-w-[160px]" onClick={() => onMovement(item, "saida")}><PackageMinus className="h-4 w-4" /> Saída</Button>
                </div>
              </div>
            </Card>
          );
        }) : (
          <Card>
            <div className="p-8 text-center">
              <p className="text-lg font-semibold text-slate-900">Nenhum item encontrado.</p>
              <p className="text-sm text-slate-500 mt-2">Cadastre um item novo ou ajuste os filtros do almoxarifado.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function MaintenancePage({
  items,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  responsibleFilter,
  setResponsibleFilter,
  responsibleOptions,
  onViewObservation,
  onBack,
  onAdd,
  onDelete,
  onEdit,
}) {
  const summary = {
    open: items.filter((item) => getMaintenanceStatus(item) !== "Entregue").length,
    delayed: items.filter((item) => getMaintenanceStatus(item) === "Atrasado").length,
    delivered: items.filter((item) => getMaintenanceStatus(item) === "Entregue").length,
    totalCost: items.reduce((acc, item) => acc + Number(item.cost || 0), 0),
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Manutenções"
          description="Controle de OS, prazos automáticos, status, atraso e observações"
          right={
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input className="pl-10" placeholder="Pesquisar OS..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Button onClick={onAdd}>Nova manutenção</Button>
              <ReturnHomeButton onClick={onBack} />
            </div>
          }
        />
      </Card>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <HomeStatCard title="OS abertas" value={summary.open} subtitle="Ainda sem entrega" icon={Clock3} />
        <HomeStatCard title="OS atrasadas" value={summary.delayed} subtitle="Prazo excedido" icon={AlertTriangle} alert={summary.delayed > 0} />
        <HomeStatCard title="OS entregues" value={summary.delivered} subtitle="Serviços concluídos" icon={FileText} />
        <HomeStatCard title="Custo total" value={formatCurrencyBR(summary.totalCost)} subtitle="Total das OS filtradas" icon={Briefcase} valueClassName="text-[1.55rem] md:text-[1.9rem]" />
      </section>

      <Card>
        <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Filtrar por status">
            <SelectField
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "todos", label: "Todos os status" },
                { value: "No prazo", label: "No prazo" },
                { value: "Atrasado", label: "Atrasado" },
                { value: "Em execução", label: "Em execução" },
                { value: "Entregue", label: "Entregue" },
              ]}
            />
          </Field>
          <Field label="Filtrar por responsável">
            <SelectField
              value={responsibleFilter}
              onChange={setResponsibleFilter}
              options={[
                { value: "todos", label: "Todos os responsáveis" },
                ...responsibleOptions.map((name) => ({ value: name, label: name })),
              ]}
            />
          </Field>
          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSearch("");
                setStatusFilter("todos");
                setResponsibleFilter("todos");
              }}
            >
              Limpar filtros
            </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100">
                {["OS", "SERVIÇO", "SOLICITANTE", "DATA SOLICITAÇÃO", "DATA REALIZAÇÃO", "DATA ENTREGA", "CUSTO (R$)", "DATA LIMITE", "RESPONSÁVEL", "STATUS", "ATRASO", "OBSERVAÇÕES", "AÇÕES"].map((head) => (
                  <th key={head} className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold text-slate-900 whitespace-nowrap">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length ? items.map((item) => {
                const status = getMaintenanceStatus(item);
                const atraso = getDelayIndicator(item);
                const delayed = status === "Atrasado";
                return (
                  <tr key={item.id} className={cn("transition-colors", delayed ? "bg-rose-50/70 hover:bg-rose-50" : "bg-white hover:bg-slate-50/80")}>
                    <td className={cn("border-b px-4 py-3 whitespace-nowrap font-semibold text-slate-800", delayed ? "border-rose-200 border-l-4 border-l-rose-500" : "border-slate-200")}>{item.os}</td>
                    <td className={cn("border-b px-4 py-3 min-w-[260px]", delayed ? "border-rose-200" : "border-slate-200")}>{item.service}</td>
                    <td className={cn("border-b px-4 py-3 whitespace-nowrap", delayed ? "border-rose-200" : "border-slate-200")}>{item.requester || "-"}</td>
                    <td className={cn("border-b px-4 py-3 whitespace-nowrap", delayed ? "border-rose-200" : "border-slate-200")}>{formatDateBR(item.requestDate)}</td>
                    <td className={cn("border-b px-4 py-3 whitespace-nowrap", delayed ? "border-rose-200" : "border-slate-200")}>{formatDateBR(item.realizationDate)}</td>
                    <td className={cn("border-b px-4 py-3 whitespace-nowrap", delayed ? "border-rose-200" : "border-slate-200")}>{formatDateBR(item.deliveryDate)}</td>
                    <td className={cn("border-b px-4 py-3 whitespace-nowrap", delayed ? "border-rose-200" : "border-slate-200")}>{formatCurrencyBR(item.cost)}</td>
                    <td className={cn("border-b px-4 py-3 whitespace-nowrap", delayed ? "border-rose-200 text-rose-700 font-semibold" : "border-slate-200")}>{formatDateBR(item.limitDate)}</td>
                    <td className={cn("border-b px-4 py-3 whitespace-nowrap", delayed ? "border-rose-200" : "border-slate-200")}>{item.responsible || "-"}</td>
                    <td className={cn("border-b px-4 py-3 whitespace-nowrap", delayed ? "border-rose-200" : "border-slate-200")}>
                      <Badge className={
                        status === "Atrasado" ? "bg-rose-100 text-rose-700 border-rose-200" :
                        status === "Entregue" ? "bg-sky-100 text-sky-700 border-sky-200" :
                        status === "Em execução" ? "bg-amber-100 text-amber-700 border-amber-200" :
                        "bg-emerald-100 text-emerald-700 border-emerald-200"
                      }>{status}</Badge>
                    </td>
                    <td className={cn("border-b px-4 py-3 whitespace-nowrap font-semibold", delayed ? "border-rose-200 text-rose-700" : "border-slate-200")}>{atraso}</td>
                    <td className={cn("border-b px-4 py-3 min-w-[180px]", delayed ? "border-rose-200" : "border-slate-200")}>
                      {item.observacao ? (
                        <Button variant="outline" className="h-9 px-3 rounded-xl" onClick={() => onViewObservation(item)}>Ver observação</Button>
                      ) : (
                        <span className="text-sm text-slate-400">Sem observações</span>
                      )}
                    </td>
                    <td className={cn("border-b px-4 py-3 whitespace-nowrap", delayed ? "border-rose-200" : "border-slate-200")}>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" className="h-9 px-3 rounded-xl" onClick={() => onEdit(item)}>Editar</Button>
                        <Button variant="danger" className="h-9 px-3 rounded-xl" onClick={() => onDelete(item.id)}>Excluir</Button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={13} className="px-4 py-6 text-center text-slate-500">Nenhuma manutenção cadastrada para esta obra.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}


function AttendancePage({ attendance, companies, roles, onBack, onAddPresence, onAddCompany, onAddRole, onDeletePresence, onDeleteCompany, onDeleteRole }) {
  const grouped = useMemo(() => {
    return companies.map((company) => {
      const companyRoles = roles.filter((role) => role.companyId === company.id);
      const rows = companyRoles.map((role) => {
        const qty = attendance
          .filter((item) => item.companyId === company.id && item.roleId === role.id)
          .reduce((acc, item) => acc + Number(item.qty || 0), 0);

        return {
          roleId: role.id,
          roleName: role.name,
          qty,
          attendanceIds: attendance.filter((item) => item.companyId === company.id && item.roleId === role.id).map((item) => item.id),
        };
      });

      return { company, rows, total: rows.reduce((acc, row) => acc + row.qty, 0) };
    });
  }, [attendance, companies, roles]);

  const totalPresent = grouped.reduce((acc, company) => acc + company.total, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Presença"
          description="Controle por empresa e cargo/função no modelo da planilha"
          right={<div className="flex flex-wrap gap-3"><Button onClick={onAddCompany}>Nova empresa</Button><Button variant="outline" onClick={onAddRole}>Nova função</Button><Button variant="outline" onClick={onAddPresence}>Lançar presença</Button><ReturnHomeButton onClick={onBack} /></div>}
        />
      </Card>

      <Card>
        <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3"><div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Users className="h-6 w-6" /></div><div><p className="text-sm text-slate-500">Total presente na obra</p><p className="text-3xl font-extrabold text-slate-900">{totalPresent}</p></div></div>
          <Badge className="bg-white text-slate-700 border-slate-300">Data base: {getTodayBR()}</Badge>
        </div>
      </Card>

      <div className="space-y-6">
        {grouped.map(({ company, rows, total }) => (
          <Card key={company.id} className="overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 p-5 border-b border-slate-100">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{company.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{company.city}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">{total} presentes</Badge>
                <Button variant="danger" className="h-9 px-3 rounded-xl" onClick={() => onDeleteCompany(company.id)}>Excluir empresa</Button>
              </div>
            </div>

            <div className="p-5">
              <div className="overflow-hidden rounded-[24px] border border-slate-200">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-bold text-slate-900">CARGO/FUNÇÃO</th>
                      <th className="border-b border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-900 w-40">PRESENTE</th>
                      <th className="border-b border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-900 w-44">AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length ? rows.map((row) => (
                      <tr key={row.roleId} className="bg-white">
                        <td className="border-b border-slate-200 px-4 py-3 text-base text-slate-800">{row.roleName}</td>
                        <td className="border-b border-slate-200 px-4 py-3 text-center text-xl font-bold text-slate-900">{row.qty}</td>
                        <td className="border-b border-slate-200 px-4 py-3">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            {row.attendanceIds.length ? <Button variant="danger" className="h-9 px-3 rounded-xl" onClick={() => onDeletePresence(row.attendanceIds[row.attendanceIds.length - 1])}>Excluir presença</Button> : null}
                            <Button variant="outline" className="h-9 px-3 rounded-xl" onClick={() => onDeleteRole(row.roleId)}>Excluir função</Button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} className="px-4 py-4 text-center text-slate-500">Nenhuma função cadastrada para esta empresa.</td></tr>
                    )}
                    <tr className="bg-slate-100">
                      <td className="px-4 py-3 text-right text-xl font-extrabold text-slate-900">TOTAL</td>
                      <td className="px-4 py-3 text-center text-2xl font-extrabold text-slate-900">{total}</td>
                      <td className="px-4 py-3" />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function buildPdfHeader(doc, title, obraNome, date, generatedAt) {
  const marginLeft = 30;
  const marginRight = 20;
  const marginTop = 20;
  const pageWidth = 210;
  let y = marginTop;

  return loadImageDataUrl(LOGO_SRC)
    .then((imageDataUrl) => {
      const logoWidth = 26;
      const logoHeight = 26;
      const textStartX = marginLeft + logoWidth + 10;
      doc.addImage(imageDataUrl, "PNG", marginLeft, y, logoWidth, logoHeight);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(title, textStartX, y + 5);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Obra: ${obraNome || "Não informada"}`, textStartX, y + 12);
      doc.setFontSize(10);
      doc.text(`Data do fechamento: ${formatDateBR(date)}`, textStartX, y + 18);
      doc.text(`Gerado em: ${generatedAt}`, textStartX, y + 24);
      y += 32;
      doc.line(marginLeft, y, pageWidth - marginRight, y);
      y += 6;
      return { y, marginLeft, marginRight };
    })
    .catch(() => ({ y: 26, marginLeft, marginRight }));
}

function addPageNumbers(doc) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.text(String(i), doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
  }
}

async function exportDailyPdf(day, companies, roles, obraNome, stockCatalog = [], stockMovements = []) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const generatedAt = getDateTimeBRNoSeconds();
  const { y, marginLeft, marginRight } = await buildPdfHeader(doc, "RELATÓRIO OPERACIONAL - NERO CONSTRUÇÕES", obraNome, day.date, generatedAt);

  const totalAttendance = (day.attendance || []).reduce((acc, row) => acc + Number(row.qty || 0), 0);
  const delayedCount = (day.maintenance || []).filter((item) => getMaintenanceStatus(item) === "Atrasado").length;
  const deliveredCount = (day.maintenance || []).filter((item) => getMaintenanceStatus(item) === "Entregue").length;
  const maintenanceCost = (day.maintenance || []).reduce((acc, item) => acc + Number(item.cost || 0), 0);
  const criticalStockCount = (day.stock || []).filter((item) => Number(item.quantity || 0) < Number(item.min || 0)).length;

  const attendanceRows = companies.flatMap((company) =>
    roles
      .filter((role) => String(role.companyId) === String(company.id))
      .map((role) => {
        const qty = (day.attendance || [])
          .filter((a) => String(a.companyId) === String(company.id) && String(a.roleId) === String(role.id))
          .reduce((acc, row) => acc + Number(row.qty || 0), 0);
        return qty > 0 ? [company.name, role.name, qty] : null;
      })
      .filter(Boolean)
  );

  const maintenanceRows = (day.maintenance || []).map((m) => [
    m.os || "-",
    m.service || "-",
    m.responsible || "-",
    getMaintenanceStatus(m),
    getDelayIndicator(m),
    m.observacao ? String(m.observacao).slice(0, 55) : "-",
  ]);

  const stockRows = (day.stock || []).map((s) => [
    getStockItemCode(s, stockCatalog) || "-",
    s.item || "-",
    s.category || "-",
    `${s.quantity || 0} ${s.unit || ""}`.trim(),
    `${s.min || 0} ${s.unit || ""}`.trim(),
    formatCurrencyBR((Number(s.quantity || 0) * Number(s.price || 0))),
  ]);

  const movementRows = (stockMovements || [])
    .filter((movement) => String(movement.obraId) === String(day.obraId) && String(movement.date || "").slice(0, 10) === String(day.date))
    .slice(0, 12)
    .map((movement) => [
      formatDateBR(movement.date),
      movement.type === "entrada" ? "Entrada" : "Saída",
      movement.code || "-",
      movement.itemName || "-",
      `${movement.quantity || 0}`,
      movement.responsible || "-",
    ]);

  autoTable(doc, {
    startY: y,
    margin: { left: marginLeft, right: marginRight },
    styles: { fontSize: 10, font: "helvetica", cellPadding: 1.6 },
    head: [["Indicador", "Valor"]],
    body: [
      ["Total presente", String(totalAttendance)],
      ["Materiais cadastrados", String((day.stock || []).length)],
      ["Itens críticos", String(criticalStockCount)],
      ["Ordens de manutenção", String((day.maintenance || []).length)],
      ["OS atrasadas", String(delayedCount)],
      ["OS entregues", String(deliveredCount)],
      ["Custo acumulado das OS", formatCurrencyBR(maintenanceCost)],
    ],
    theme: "grid"
  });

  let nextY = doc.lastAutoTable.finalY + 6;
  autoTable(doc, {
    startY: nextY,
    margin: { left: marginLeft, right: marginRight },
    styles: { fontSize: 10, font: "helvetica", cellPadding: 1.5 },
    head: [["Empresa", "Função", "Quantidade"]],
    body: attendanceRows.length ? attendanceRows : [["Sem registros", "-", "-"]],
    theme: "grid"
  });

  nextY = doc.lastAutoTable.finalY + 6;
  autoTable(doc, {
    startY: nextY,
    margin: { left: marginLeft, right: marginRight },
    styles: { fontSize: 8.6, font: "helvetica", cellPadding: 1.4 },
    head: [["OS", "Serviço", "Responsável", "Status", "Atraso", "Obs."]],
    body: maintenanceRows.length ? maintenanceRows : [["Sem manutenções", "-", "-", "-", "-", "-"]],
    theme: "grid"
  });

  nextY = doc.lastAutoTable.finalY + 6;
  autoTable(doc, {
    startY: nextY,
    margin: { left: marginLeft, right: marginRight },
    styles: { fontSize: 8.5, font: "helvetica", cellPadding: 1.4 },
    head: [["Código", "Material", "Categoria", "Saldo", "Mínimo", "Valor estoque"]],
    body: stockRows.length ? stockRows : [["Sem materiais", "-", "-", "-", "-", "-"]],
    theme: "grid"
  });

  nextY = doc.lastAutoTable.finalY + 6;
  autoTable(doc, {
    startY: nextY,
    margin: { left: marginLeft, right: marginRight },
    styles: { fontSize: 8.5, font: "helvetica", cellPadding: 1.4 },
    head: [["Data", "Tipo", "Código", "Material", "Qtd.", "Responsável"]],
    body: movementRows.length ? movementRows : [["Sem movimentações no dia", "-", "-", "-", "-", "-"]],
    theme: "grid"
  });

  addPageNumbers(doc);
  doc.save(`relatorio-operacional-${String(obraNome || "obra").toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-${day.date}.pdf`);
}

function HistoryPage({ history, companies, roles, stockCatalog, stockMovements, onBack, obraAtual }) {
  const [selected, setSelected] = useState(null);
  return (
    <div className="space-y-6">
      <Card><CardHeader title="Histórico diário" description={obraAtual ? `Dias fechados da obra: ${obraAtual.nome}` : "Selecione uma obra"} right={<ReturnHomeButton onClick={onBack} />} /></Card>
      {!history.length ? (
        <Card><div className="p-8 text-center"><p className="text-lg font-semibold text-slate-900">Nenhum dia fechado ainda para esta obra.</p><p className="text-sm text-slate-500 mt-2">Use o botão “Fechar dia” no dashboard.</p></div></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {history.map((day) => (
            <Card key={day.id}>
              <div className="p-5 space-y-3">
                <p className="font-semibold text-slate-900">{formatDateBR(day.date)}</p>
                <div className="text-sm text-slate-500">Obra: {day.obraName || "-"}</div>
                <div className="text-sm text-slate-500">{day.maintenance?.length || 0} manutenções • {day.stock?.length || 0} itens • {day.attendance?.length || 0} registros</div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => setSelected(day)}>Ver detalhes</Button>
                  <Button onClick={() => exportDailyPdf(day, companies, roles, day.obraName, stockCatalog, stockMovements)}><FileText className="h-4 w-4" /> PDF Geral</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selected ? (
        <Card>
          <CardHeader title={`Detalhes - ${formatDateBR(selected.date)}`} description={`Obra: ${selected.obraName || "-"} • Snapshot salvo em ${new Date(selected.createdAt).toLocaleString("pt-BR")}`} right={<Button variant="outline" onClick={() => setSelected(null)}>Fechar</Button>} />
          <div className="p-5 space-y-6">
            <div><h4 className="font-bold text-slate-900 mb-3">Presença</h4><div className="space-y-2">{(selected.attendance || []).map((row) => <div key={row.id} className="flex justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50"><span>{row.companyId} / {row.roleId}</span><strong>{row.qty}</strong></div>)}</div></div>
            <div><h4 className="font-bold text-slate-900 mb-3">Almoxarifado</h4><div className="space-y-2">{(selected.stock || []).map((row) => <div key={row.id} className="flex justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50"><span>{row.item}</span><strong>{row.quantity}</strong></div>)}</div></div>
            <div><h4 className="font-bold text-slate-900 mb-3">Manutenções</h4><div className="space-y-2">{(selected.maintenance || []).map((row) => <div key={row.id} className="flex justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50"><span>{row.os} - {row.service}</span><strong>{getMaintenanceStatus(row)}</strong></div>)}</div></div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(() => readStoredLocalData());
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [obraId, setObraId] = useState(() => readStoredSelectedObra() || readStoredLocalData().obras?.[0]?.id || "");
  const [onlineMode, setOnlineMode] = useState(() => readStoredOnlineMode());
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [attendanceModal, setAttendanceModal] = useState(false);
  const [stockModal, setStockModal] = useState(false);
  const [stockMovementModal, setStockMovementModal] = useState(false);
  const [stockHistoryModal, setStockHistoryModal] = useState(false);
  const [stockCategoryModal, setStockCategoryModal] = useState(false);
  const [maintenanceModal, setMaintenanceModal] = useState(false);
  const [companyModal, setCompanyModal] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const [obraModal, setObraModal] = useState(false);
  const [editingMaintenanceId, setEditingMaintenanceId] = useState(null);
  const [editingMaintenanceObraId, setEditingMaintenanceObraId] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState("todos");
  const [maintenanceResponsibleFilter, setMaintenanceResponsibleFilter] = useState("todos");
  const [observationModalItem, setObservationModalItem] = useState(null);
  const [stockSearch, setStockSearch] = useState("");
  const [stockCategoryFilter, setStockCategoryFilter] = useState("todos");
  const [stockCriticalOnly, setStockCriticalOnly] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState(null);
  const [stockMovementType, setStockMovementType] = useState("entrada");
  const [stockCategoryForm, setStockCategoryForm] = useState({ name: "", prefix: "" });

  const [attendanceBatchCompanyId, setAttendanceBatchCompanyId] = useState("");
  const [attendanceBatchQuantities, setAttendanceBatchQuantities] = useState({});
  const [companyForm, setCompanyForm] = useState({ name: "", city: "" });
  const [roleForm, setRoleForm] = useState({ companyId: "", name: "" });
  const [obraForm, setObraForm] = useState({ nome: "", cliente: "", local: "", status: "Ativa", dataInicio: getTodayISO(), observacao: "" });
  const [stockForm, setStockForm] = useState({ category: "", catalogCode: "", customItemName: "", unit: "un", quantity: 0, min: 0, invoice: "", price: 0 });
  const [stockMovementForm, setStockMovementForm] = useState({ date: getTodayISO(), quantity: 1, responsible: "", observacao: "" });
  const [maintenanceForm, setMaintenanceForm] = useState({
    os: "",
    service: "",
    requester: "",
    requestDate: getTodayISO(),
    realizationDate: "",
    deliveryDate: "",
    cost: 0,
    limitDate: addDaysISO(getTodayISO(), 7),
    responsible: "",
    observacao: "",
  });

  const obraAtual = useMemo(() => data.obras.find((obra) => String(obra.id) === String(obraId)) || null, [data.obras, obraId]);

  const filteredData = useMemo(() => {
    if (!obraAtual) return { companies: data.companies, roles: data.roles, stock: [], maintenance: [], attendance: [], history: [] };
    return {
      companies: data.companies.filter((item) => !item.obraId || String(item.obraId) === String(obraAtual.id)),
      roles: data.roles.filter((item) => !item.obraId || String(item.obraId) === String(obraAtual.id)),
      stock: data.stock.filter((item) => String(item.obraId) === String(obraAtual.id)),
      maintenance: data.maintenance.filter((item) => String(item.obraId) === String(obraAtual.id)),
      attendance: data.attendance.filter((item) => String(item.obraId) === String(obraAtual.id)),
      history: data.history.filter((item) => String(item.obraId) === String(obraAtual.id)),
    };
  }, [data, obraAtual]);

  const selectedAttendanceRoles = useMemo(() => {
    return filteredData.roles.filter((role) => String(role.companyId) === String(attendanceBatchCompanyId));
  }, [filteredData.roles, attendanceBatchCompanyId]);

  const attendanceBatchTotal = useMemo(() => {
    return Object.values(attendanceBatchQuantities).reduce((acc, value) => acc + Number(value || 0), 0);
  }, [attendanceBatchQuantities]);

  const maintenanceResponsibleOptions = useMemo(() => {
    return Array.from(
      new Set(
        filteredData.maintenance
          .map((item) => (item.responsible || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [filteredData.maintenance]);

  const filteredMaintenance = useMemo(() => {
    return filteredData.maintenance.filter((item) => {
      const haystack = [
        item.os,
        item.service,
        item.requester,
        item.responsible,
        item.observacao,
        getMaintenanceStatus(item),
        getDelayIndicator(item),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search.trim() || haystack.includes(search.toLowerCase());
      const status = getMaintenanceStatus(item);
      const matchesStatus = maintenanceStatusFilter === "todos" || status === maintenanceStatusFilter;
      const matchesResponsible = maintenanceResponsibleFilter === "todos" || (item.responsible || "") === maintenanceResponsibleFilter;

      return matchesSearch && matchesStatus && matchesResponsible;
    });
  }, [filteredData.maintenance, search, maintenanceStatusFilter, maintenanceResponsibleFilter]);


const filteredStock = useMemo(() => {
  return filteredData.stock.filter((item) => {
    const code = getStockItemCode(item, data.stockCatalog);
    const haystack = [code, item.item, item.category].join(" ").toLowerCase();
    const matchesSearch = !stockSearch.trim() || haystack.includes(stockSearch.toLowerCase());
    const matchesCategory = stockCategoryFilter === "todos" || item.category === stockCategoryFilter;
    const matchesCritical = !stockCriticalOnly || Number(item.quantity) < Number(item.min);
    return matchesSearch && matchesCategory && matchesCritical;
  });
}, [filteredData.stock, data.stockCatalog, stockSearch, stockCategoryFilter, stockCriticalOnly]);

const materialsForSelectedStockCategory = useMemo(() => {
  return data.stockCatalog
    .filter((item) => item.category === stockForm.category)
    .sort((a, b) => a.code.localeCompare(b.code, "pt-BR"));
}, [data.stockCatalog, stockForm.category]);

const nextCustomStockCode = useMemo(() => {
  const selectedCategory = data.stockCategories.find((category) => category.name === stockForm.category);
  if (!selectedCategory) return "";
  return buildNextMaterialCode(selectedCategory.prefix, data.stockCatalog);
}, [data.stockCategories, data.stockCatalog, stockForm.category]);

const selectedStockHistory = useMemo(() => {
  if (!selectedStockItem) return [];
  return data.stockMovements
    .filter((movement) => String(movement.itemId) === String(selectedStockItem.id))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}, [data.stockMovements, selectedStockItem]);


  async function fetchAllData() {
    if (!isSupabaseConfigured || !onlineMode) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage("");
    try {
      const [obrasRes, companiesRes, rolesRes, stockRes, maintenanceRes, attendanceRes, historyRes] = await Promise.all([
        supabase.from("obras").select("*").order("id", { ascending: true }),
        supabase.from("companies").select("*").order("id", { ascending: true }),
        supabase.from("roles").select("*").order("id", { ascending: true }),
        supabase.from("stock_items").select("*").order("id", { ascending: true }),
        supabase.from("maintenance_orders").select("*").order("id", { ascending: true }),
        supabase.from("attendance_records").select("*").order("id", { ascending: true }),
        supabase.from("history_snapshots").select("*").order("date", { ascending: false }),
      ]);

      const errors = [obrasRes.error, companiesRes.error, rolesRes.error, stockRes.error, maintenanceRes.error, attendanceRes.error, historyRes.error].filter(Boolean);
      if (errors.length) throw errors[0];

      const preservedLocalData = readStoredLocalData();

      const nextData = {
        obras: (obrasRes.data || []).map((row) => ({ id: row.id, nome: row.nome, cliente: row.cliente, local: row.local, status: row.status, dataInicio: row.data_inicio, observacao: row.observacao })),
        companies: (companiesRes.data || []).map((row) => ({ id: row.id, obraId: row.obra_id, name: row.name, city: row.city })),
        roles: (rolesRes.data || []).map((row) => ({ id: row.id, obraId: row.obra_id, companyId: row.company_id, name: row.name })),
        stock: (stockRes.data || []).map((row) => ({ id: row.id, obraId: row.obra_id, item: row.item, unit: row.unit, quantity: row.quantity, min: row.min_quantity, category: row.category, invoice: row.invoice, price: row.price })),
        maintenance: (maintenanceRes.data || []).map((row) => ({ id: row.id, obraId: row.obra_id, os: row.os, service: row.service || row.title || "", requester: row.requester, requestDate: row.request_date, realizationDate: row.realization_date, deliveryDate: row.delivery_date, cost: row.cost, limitDate: row.limit_date, responsible: row.responsible, observacao: row.observacao || "" })),
        attendance: (attendanceRes.data || []).map((row) => ({ id: row.id, obraId: row.obra_id, companyId: row.company_id, roleId: row.role_id, qty: row.qty })),
        history: (historyRes.data || []).map((row) => ({ id: row.id, obraId: row.obra_id, date: row.date, createdAt: row.created_at, obraName: row.obra_nome, stock: row.snapshot?.stock || [], maintenance: row.snapshot?.maintenance || [], attendance: row.snapshot?.attendance || [] })),
        stockMovements: preservedLocalData.stockMovements || [],
        stockCategories: preservedLocalData.stockCategories?.length ? preservedLocalData.stockCategories : DEFAULT_STOCK_CATEGORIES,
        stockCatalog: preservedLocalData.stockCatalog?.length ? preservedLocalData.stockCatalog : DEFAULT_STOCK_CATALOG,
      };

      setData(nextData);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(nextData));
      }
      if (!obraId && nextData.obras[0]) setObraId(nextData.obras[0].id);
    } catch (error) {
      console.error(error);
      setErrorMessage("Não foi possível carregar os dados do Supabase. Confira as tabelas/colunas do script novo.");
      setOnlineMode(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllData();
  }, [onlineMode]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(""), 2600);
    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LOCAL_ONLINE_MODE_KEY, String(onlineMode));
  }, [onlineMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (obraId) {
      window.localStorage.setItem(LOCAL_SELECTED_OBRA_KEY, String(obraId));
    } else {
      window.localStorage.removeItem(LOCAL_SELECTED_OBRA_KEY);
    }
  }, [obraId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(data));
  }, [data]);


  function resetMaintenanceForm() {
    setMaintenanceForm({
      os: "",
      service: "",
      requester: "",
      requestDate: getTodayISO(),
      realizationDate: "",
      deliveryDate: "",
      cost: 0,
      limitDate: addDaysISO(getTodayISO(), 7),
      responsible: "",
      observacao: "",
    });
    setEditingMaintenanceId(null);
    setEditingMaintenanceObraId("");
  }


function resetStockForm() {
  setStockForm({ category: "", catalogCode: "", customItemName: "", unit: "un", quantity: 0, min: 0, invoice: "", price: 0 });
}

function openNewStockModal() {
  resetStockForm();
  setStockModal(true);
}

function openStockMovementModal(item, type) {
  setSelectedStockItem(item);
  setStockMovementType(type);
  setStockMovementForm({ date: getTodayISO(), quantity: 1, responsible: "", observacao: "" });
  setStockMovementModal(true);
}

function openStockHistoryModal(item) {
  setSelectedStockItem(item);
  setStockHistoryModal(true);
}

  function openNewMaintenanceModal() {
    resetMaintenanceForm();
    setMaintenanceModal(true);
  }

  function openEditMaintenanceModal(item) {
    setEditingMaintenanceId(item.id);
    setEditingMaintenanceObraId(item.obraId);
    setMaintenanceForm({
      os: item.os || "",
      service: item.service || "",
      requester: item.requester || "",
      requestDate: item.requestDate || getTodayISO(),
      realizationDate: item.realizationDate || "",
      deliveryDate: item.deliveryDate || "",
      cost: item.cost ?? 0,
      limitDate: item.limitDate || addDaysISO(item.requestDate || getTodayISO(), 7),
      responsible: item.responsible || "",
      observacao: item.observacao || "",
    });
    setMaintenanceModal(true);
  }


  async function addObra() {
    const payload = { ...obraForm };
    if (onlineMode && isSupabaseConfigured) {
      const { data: insertedObra, error } = await supabase
        .from("obras")
        .insert({ nome: payload.nome, cliente: payload.cliente, local: payload.local, status: payload.status, data_inicio: payload.dataInicio, observacao: payload.observacao })
        .select()
        .single();
      if (error) return setErrorMessage(error.message);
      setErrorMessage("");
      await fetchAllData();
      setObraId(insertedObra.id);
      setSuccessMessage("Obra salva com sucesso.");
    } else {
      const localPayload = { id: generateId(), ...payload };
      setData((prev) => ({ ...prev, obras: [...prev.obras, localPayload] }));
      setObraId(localPayload.id);
      setSuccessMessage("Obra salva com sucesso.");
    }
    setObraModal(false);
    setObraForm({ nome: "", cliente: "", local: "", status: "Ativa", dataInicio: getTodayISO(), observacao: "" });
  }

  async function addCompany() {
    const payload = { obraId, name: companyForm.name, city: companyForm.city };
    if (onlineMode && isSupabaseConfigured) {
      const { error } = await supabase.from("companies").insert({ obra_id: payload.obraId, name: payload.name, city: payload.city });
      if (error) return setErrorMessage(error.message);
      await fetchAllData();
    } else {
      const localPayload = { id: generateId(), ...payload };
      setData((prev) => ({ ...prev, companies: [...prev.companies, localPayload] }));
    }
    setCompanyModal(false);
    setCompanyForm({ name: "", city: "" });
    setSuccessMessage("Empresa salva com sucesso.");
  }

  async function addRole() {
    const payload = { obraId, companyId: Number(roleForm.companyId), name: roleForm.name };
    if (onlineMode && isSupabaseConfigured) {
      const { error } = await supabase.from("roles").insert({ obra_id: payload.obraId, company_id: payload.companyId, name: payload.name });
      if (error) return setErrorMessage(error.message);
      await fetchAllData();
    } else {
      const localPayload = { id: generateId(), ...payload };
      setData((prev) => ({ ...prev, roles: [...prev.roles, localPayload] }));
    }
    setRoleModal(false);
    setRoleForm({ companyId: "", name: "" });
    setSuccessMessage("Função salva com sucesso.");
  }

  async function addAttendanceRecord() {
    const companyId = Number(attendanceBatchCompanyId);
    const validRoles = filteredData.roles.filter((role) => Number(role.companyId) === companyId);
    const payloads = validRoles
      .map((role) => ({
        obraId,
        companyId,
        roleId: role.id,
        qty: Number(attendanceBatchQuantities[role.id] || 0),
      }))
      .filter((item) => item.qty > 0);

    if (!companyId) return;

    if (onlineMode && isSupabaseConfigured) {
      const roleIds = validRoles.map((role) => role.id);
      if (roleIds.length) {
        const { error: deleteError } = await supabase.from("attendance_records").delete().eq("obra_id", obraId).eq("company_id", companyId).in("role_id", roleIds);
        if (deleteError) return setErrorMessage(deleteError.message);
      }
      if (payloads.length) {
        const { error } = await supabase.from("attendance_records").insert(payloads.map((item) => ({ obra_id: item.obraId, company_id: item.companyId, role_id: item.roleId, qty: item.qty })));
        if (error) return setErrorMessage(error.message);
      }
      await fetchAllData();
    } else {
      const localPayloads = payloads.map((item) => ({ id: generateId(), ...item }));
      setData((prev) => ({ ...prev, attendance: [...prev.attendance.filter((item) => !(String(item.obraId) === String(obraId) && Number(item.companyId) === companyId)), ...localPayloads] }));
    }

    setAttendanceModal(false);
    setAttendanceBatchCompanyId("");
    setAttendanceBatchQuantities({});
    setSuccessMessage("Presença salva com sucesso.");
  }


async function addStockItem() {
  const selectedCategory = data.stockCategories.find((category) => category.name === stockForm.category);
  if (!selectedCategory) return setErrorMessage("Selecione uma categoria válida.");

  const selectedCatalogItem = data.stockCatalog.find((item) => item.code === stockForm.catalogCode);
  const isNewCatalogItem = stockForm.catalogCode === "__new__";
  const generatedCode = buildNextMaterialCode(selectedCategory.prefix, data.stockCatalog);
  const finalCode = isNewCatalogItem ? generatedCode : selectedCatalogItem?.code || "";
  const finalItemName = isNewCatalogItem ? stockForm.customItemName.trim() : selectedCatalogItem?.name || "";
  const finalCategory = selectedCategory.name;

  if (!finalItemName) return setErrorMessage("Selecione ou informe o material.");

  const payload = {
    obraId,
    item: finalItemName,
    unit: stockForm.unit,
    quantity: Number(stockForm.quantity),
    min: Number(stockForm.min),
    category: finalCategory,
    invoice: stockForm.invoice,
    price: Number(stockForm.price),
    code: finalCode,
    categoryPrefix: selectedCategory.prefix,
  };

  const catalogAlreadyExists = data.stockCatalog.some((item) => item.code === finalCode);
  const nextCatalog = isNewCatalogItem && !catalogAlreadyExists
    ? [...data.stockCatalog, { code: finalCode, name: finalItemName, category: finalCategory, prefix: selectedCategory.prefix }]
    : data.stockCatalog;

  if (onlineMode && isSupabaseConfigured) {
    const { data: insertedRow, error } = await supabase
      .from("stock_items")
      .insert({
        obra_id: payload.obraId,
        item: payload.item,
        unit: payload.unit,
        quantity: payload.quantity,
        min_quantity: payload.min,
        category: payload.category,
        invoice: payload.invoice,
        price: payload.price,
      })
      .select()
      .single();

    if (error) return setErrorMessage(error.message);

    setData((prev) => ({
      ...prev,
      stock: [
        ...prev.stock,
        {
          id: insertedRow.id,
          obraId: insertedRow.obra_id,
          item: insertedRow.item,
          unit: insertedRow.unit,
          quantity: insertedRow.quantity,
          min: insertedRow.min_quantity,
          category: insertedRow.category,
          invoice: insertedRow.invoice,
          price: insertedRow.price,
          code: payload.code,
          categoryPrefix: payload.categoryPrefix,
        },
      ],
      stockCatalog: nextCatalog,
    }));
  } else {
    const localPayload = { id: generateId(), ...payload };
    setData((prev) => ({ ...prev, stock: [...prev.stock, localPayload], stockCatalog: nextCatalog }));
  }

  setStockModal(false);
  resetStockForm();
  setSuccessMessage("Material salvo com sucesso.");
}

async function addStockMovement() {
  if (!selectedStockItem) return;
  const quantity = Number(stockMovementForm.quantity || 0);
  if (quantity <= 0) return setErrorMessage("Informe uma quantidade válida.");

  const currentQuantity = Number(selectedStockItem.quantity || 0);
  const nextQuantity = stockMovementType === "entrada" ? currentQuantity + quantity : currentQuantity - quantity;
  if (stockMovementType === "saida" && nextQuantity < 0) {
    return setErrorMessage("A saída não pode deixar o saldo negativo.");
  }

  if (onlineMode && isSupabaseConfigured) {
    const { error } = await supabase.from("stock_items").update({ quantity: nextQuantity }).eq("id", selectedStockItem.id);
    if (error) return setErrorMessage(error.message);
  }

  const movement = {
    id: generateId(),
    itemId: selectedStockItem.id,
    obraId,
    type: stockMovementType,
    quantity,
    date: stockMovementForm.date,
    responsible: stockMovementForm.responsible,
    observacao: stockMovementForm.observacao,
    previousQuantity: currentQuantity,
    nextQuantity,
  };

  setData((prev) => ({
    ...prev,
    stock: prev.stock.map((item) =>
      String(item.id) === String(selectedStockItem.id) ? { ...item, quantity: nextQuantity } : item
    ),
    stockMovements: [movement, ...prev.stockMovements],
  }));

  setStockMovementModal(false);
  setSelectedStockItem(null);
  setStockMovementForm({ date: getTodayISO(), quantity: 1, responsible: "", observacao: "" });
  setSuccessMessage(`Movimentação de ${stockMovementType === "entrada" ? "entrada" : "saída"} registrada com sucesso.`);
}

function addStockCategory() {
  const name = stockCategoryForm.name.trim();
  const prefix = normalizePrefix(stockCategoryForm.prefix);

  if (!name || !prefix) return setErrorMessage("Informe o nome e o prefixo da categoria.");
  if (data.stockCategories.some((category) => normalizePrefix(category.prefix) === prefix || category.name.toLowerCase() === name.toLowerCase())) {
    return setErrorMessage("Já existe uma categoria com este nome ou prefixo.");
  }

  setData((prev) => ({
    ...prev,
    stockCategories: [...prev.stockCategories, { name, prefix }].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
  }));
  setStockCategoryForm({ name: "", prefix: "" });
  setSuccessMessage("Categoria cadastrada com sucesso.");
}

function deleteStockCategory(categoryName) {
  const category = data.stockCategories.find((item) => item.name === categoryName);
  if (!category) return;

  const hasStock = data.stock.some((item) => item.category === categoryName);
  if (hasStock) {
    return setErrorMessage("Não é possível excluir uma categoria que já possui itens cadastrados.");
  }

  const confirmed = window.confirm(`Excluir a categoria "${categoryName}" e os materiais do catálogo vinculados a ela?`);
  if (!confirmed) return;

  setData((prev) => ({
    ...prev,
    stockCategories: prev.stockCategories.filter((item) => item.name !== categoryName),
    stockCatalog: prev.stockCatalog.filter((item) => item.category !== categoryName),
  }));
  setSuccessMessage("Categoria removida com sucesso.");
}

async function addMaintenanceOrder() {
    const isEditing = Boolean(editingMaintenanceId);
    const payload = { obraId: editingMaintenanceObraId || obraId, ...maintenanceForm };
    if (onlineMode && isSupabaseConfigured) {
      if (editingMaintenanceId) {
        const { error } = await supabase
          .from("maintenance_orders")
          .update({
            title: payload.service,
            os: payload.os,
            service: payload.service,
            requester: payload.requester,
            request_date: payload.requestDate,
            realization_date: payload.realizationDate || null,
            delivery_date: payload.deliveryDate || null,
            cost: Number(payload.cost),
            limit_date: payload.limitDate,
            responsible: payload.responsible,
            observacao: payload.observacao || "",
          })
          .eq("id", editingMaintenanceId)
          .eq("obra_id", payload.obraId);
        if (error) return setErrorMessage(error.message);
      } else {
        const { error } = await supabase.from("maintenance_orders").insert({
          obra_id: payload.obraId,
          title: payload.service,
          os: payload.os,
          service: payload.service,
          requester: payload.requester,
          request_date: payload.requestDate,
          realization_date: payload.realizationDate || null,
          delivery_date: payload.deliveryDate || null,
          cost: Number(payload.cost),
          limit_date: payload.limitDate,
          responsible: payload.responsible,
          observacao: payload.observacao || "",
        });
        if (error) return setErrorMessage(error.message);
      }
      await fetchAllData();
    } else {
      if (editingMaintenanceId) {
        setData((prev) => ({
          ...prev,
          maintenance: prev.maintenance.map((item) =>
            item.id === editingMaintenanceId ? { ...item, obraId: payload.obraId, ...payload } : item
          ),
        }));
      } else {
        const localPayload = { id: generateId(), ...payload };
        setData((prev) => ({ ...prev, maintenance: [...prev.maintenance, localPayload] }));
      }
    }
    setMaintenanceModal(false);
    resetMaintenanceForm();
    setSuccessMessage(isEditing ? "OS atualizada com sucesso." : "OS cadastrada com sucesso.");
  }

  async function deleteCompany(id) {
    if (onlineMode && isSupabaseConfigured) {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) return setErrorMessage(error.message);
      await fetchAllData();
    } else {
      setData((prev) => ({ ...prev, companies: prev.companies.filter((item) => item.id !== id), roles: prev.roles.filter((item) => item.companyId !== id), attendance: prev.attendance.filter((item) => item.companyId !== id) }));
    }
  }

  async function deleteRole(id) {
    if (onlineMode && isSupabaseConfigured) {
      const { error } = await supabase.from("roles").delete().eq("id", id);
      if (error) return setErrorMessage(error.message);
      await fetchAllData();
    } else {
      setData((prev) => ({ ...prev, roles: prev.roles.filter((item) => item.id !== id), attendance: prev.attendance.filter((item) => item.roleId !== id) }));
    }
  }

  async function deleteAttendanceRecord(id) {
    if (onlineMode && isSupabaseConfigured) {
      const { error } = await supabase.from("attendance_records").delete().eq("id", id);
      if (error) return setErrorMessage(error.message);
      await fetchAllData();
    } else {
      setData((prev) => ({ ...prev, attendance: prev.attendance.filter((item) => item.id !== id) }));
    }
  }

  async function deleteStockItem(id) {
    if (onlineMode && isSupabaseConfigured) {
      const { error } = await supabase.from("stock_items").delete().eq("id", id);
      if (error) return setErrorMessage(error.message);
      setData((prev) => ({
        ...prev,
        stock: prev.stock.filter((item) => String(item.id) !== String(id)),
        stockMovements: prev.stockMovements.filter((movement) => String(movement.itemId) !== String(id)),
      }));
    } else {
      setData((prev) => ({
        ...prev,
        stock: prev.stock.filter((item) => String(item.id) !== String(id)),
        stockMovements: prev.stockMovements.filter((movement) => String(movement.itemId) !== String(id)),
      }));
    }
  }

  async function deleteMaintenanceOrder(id) {
    if (onlineMode && isSupabaseConfigured) {
      const { error } = await supabase.from("maintenance_orders").delete().eq("id", id);
      if (error) return setErrorMessage(error.message);
      await fetchAllData();
    } else {
      setData((prev) => ({ ...prev, maintenance: prev.maintenance.filter((item) => item.id !== id) }));
    }
  }

  async function exportCurrentOperationalPdf() {
    if (!obraAtual) return;
    const snapshot = {
      obraId: obraAtual.id,
      date: getTodayISO(),
      obraName: obraAtual.nome,
      stock: filteredData.stock,
      maintenance: filteredData.maintenance,
      attendance: filteredData.attendance,
    };
    await exportDailyPdf(snapshot, filteredData.companies, filteredData.roles, obraAtual.nome, data.stockCatalog, data.stockMovements);
    setSuccessMessage("PDF operacional gerado com sucesso.");
  }

  async function closeDay() {
    if (!obraAtual) return;

    const summaryMessage = [
      `Fechar o dia da obra "${obraAtual.nome}"?`,
      "",
      `Total presente: ${filteredData.attendance.reduce((acc, item) => acc + Number(item.qty || 0), 0)}`,
      `Materiais cadastrados: ${filteredData.stock.length}`,
      `Itens críticos: ${filteredData.stock.filter((item) => Number(item.quantity || 0) < Number(item.min || 0)).length}`,
      `Ordens de manutenção: ${filteredData.maintenance.length}`,
      `OS atrasadas: ${filteredData.maintenance.filter((item) => getMaintenanceStatus(item) === "Atrasado").length}`,
    ].join("\n");
    if (!window.confirm(summaryMessage)) return;

    const snapshot = {
      id: generateId(),
      obraId: obraAtual.id,
      date: getTodayISO(),
      createdAt: new Date().toISOString(),
      obraName: obraAtual.nome,
      stock: filteredData.stock,
      maintenance: filteredData.maintenance,
      attendance: filteredData.attendance,
    };

    const existingSnapshot = filteredData.history.find((item) => String(item.date) === String(snapshot.date));

    if (onlineMode && isSupabaseConfigured) {
      if (existingSnapshot?.id) {
        const { error } = await supabase
          .from("history_snapshots")
          .update({
            obra_nome: snapshot.obraName,
            snapshot: { stock: snapshot.stock, maintenance: snapshot.maintenance, attendance: snapshot.attendance },
          })
          .eq("id", existingSnapshot.id);
        if (error) return setErrorMessage(error.message);
      } else {
        const { error } = await supabase.from("history_snapshots").insert({
          obra_id: snapshot.obraId,
          date: snapshot.date,
          obra_nome: snapshot.obraName,
          snapshot: { stock: snapshot.stock, maintenance: snapshot.maintenance, attendance: snapshot.attendance },
        });
        if (error) return setErrorMessage(error.message);
      }
      await fetchAllData();
    } else {
      setData((prev) => ({
        ...prev,
        history: [
          snapshot,
          ...prev.history.filter(
            (item) => !(String(item.obraId) === String(snapshot.obraId) && String(item.date) === String(snapshot.date))
          ),
        ],
      }));
    }

    setSuccessMessage(existingSnapshot ? "Fechamento do dia atualizado com sucesso." : "Dia fechado com sucesso.");
  }

  function buildBackup() {
    return {
      exportedAt: new Date().toISOString(),
      version: 1,
      data,
    };
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-nero-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importBackupFromFile(file) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed?.data) throw new Error("Arquivo inválido.");

        const importedData = {
          obras: parsed.data.obras || [],
          companies: parsed.data.companies || [],
          roles: parsed.data.roles || [],
          stock: parsed.data.stock || [],
          stockMovements: parsed.data.stockMovements || [],
          stockCategories: parsed.data.stockCategories?.length ? parsed.data.stockCategories : DEFAULT_STOCK_CATEGORIES,
          stockCatalog: parsed.data.stockCatalog?.length ? parsed.data.stockCatalog : DEFAULT_STOCK_CATALOG,
          maintenance: (parsed.data.maintenance || []).map((item) => ({
            ...item,
            observacao: item.observacao || "",
          })),
          attendance: parsed.data.attendance || [],
          history: parsed.data.history || [],
        };

        setOnlineMode(false);
        setErrorMessage("");
        setData(importedData);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(importedData));
        }
        const nextObraId = importedData.obras?.[0]?.id || "";
        setObraId(nextObraId);
        setSuccessMessage("Backup importado em modo local.");
      } catch (error) {
        setErrorMessage("Não foi possível ler o backup. Verifique se é um JSON exportado pelo sistema.");
      }
    };
    reader.readAsText(file);
  }

  function resetData() {
    setData(initialData);
    setCurrentPage("dashboard");
    setSearch("");
    setObraId(initialData.obras[0]?.id || "");
    setErrorMessage("");
    setSuccessMessage("");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LOCAL_DATA_KEY);
      window.localStorage.removeItem(LOCAL_SELECTED_OBRA_KEY);
    }
  }

  const connectionBadge = (
    <div className="flex items-center gap-2">
      <ConnectionBadge configured={isSupabaseConfigured} onlineMode={onlineMode} />
      {isSupabaseConfigured ? <Button variant="outline" className="h-10 rounded-full px-4" onClick={() => setOnlineMode((prev) => !prev)}>{onlineMode ? "Ir para local" : "Ir para online"}</Button> : null}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-[1520px] px-3 md:px-4 xl:px-5">
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <div className="flex-1 min-w-0">
          <Topbar
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            onReset={resetData}
            onCloseDay={closeDay}
            obraId={obraId}
            setObraId={setObraId}
            obras={data.obras}
            connectionBadge={connectionBadge}
            onOpenObras={() => setObraModal(true)}
            onExportBackup={exportBackup}
            onImportBackupClick={() => document.getElementById("backup-input").click()}
          />

          <input id="backup-input" type="file" accept=".json,application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importBackupFromFile(e.target.files[0])} />

          {errorMessage ? <div className="px-6 md:px-12 pt-6"><div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div></div> : null}
          {successMessage ? <div className="px-6 md:px-12 pt-6"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div></div> : null}

          <main className="px-6 md:px-12 py-8 md:py-10">
            {loading ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
                <p className="text-lg font-semibold text-slate-900">Carregando dados...</p>
                <p className="text-sm text-slate-500 mt-2">Aguarde a sincronização do sistema.</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={currentPage} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
                  {currentPage === "dashboard" && <DashboardPage data={filteredData} obraAtual={obraAtual} historyCountForObra={filteredData.history.length} onGoToStock={() => setCurrentPage("stock")} onGoToMaintenance={() => setCurrentPage("maintenance")} onGoToAttendance={() => setCurrentPage("attendance")} onGoToHistory={() => setCurrentPage("history")} onExportCurrentPdf={exportCurrentOperationalPdf} onCloseDay={closeDay} />}
                  {currentPage === "stock" && (
                    <StockPage
                      stock={filteredStock}
                      stockCatalog={data.stockCatalog}
                      stockCategories={data.stockCategories}
                      stockMovements={data.stockMovements.filter((movement) => String(movement.obraId) === String(obraAtual?.id))}
                      search={stockSearch}
                      setSearch={setStockSearch}
                      categoryFilter={stockCategoryFilter}
                      setCategoryFilter={setStockCategoryFilter}
                      criticalOnly={stockCriticalOnly}
                      setCriticalOnly={setStockCriticalOnly}
                      onBack={() => setCurrentPage("dashboard")}
                      onAdd={openNewStockModal}
                      onDelete={deleteStockItem}
                      onMovement={openStockMovementModal}
                      onHistory={openStockHistoryModal}
                      onCategories={() => setStockCategoryModal(true)}
                    />
                  )}
                  {currentPage === "maintenance" && <MaintenancePage items={filteredMaintenance} search={search} setSearch={setSearch} statusFilter={maintenanceStatusFilter} setStatusFilter={setMaintenanceStatusFilter} responsibleFilter={maintenanceResponsibleFilter} setResponsibleFilter={setMaintenanceResponsibleFilter} responsibleOptions={maintenanceResponsibleOptions} onViewObservation={setObservationModalItem} onBack={() => setCurrentPage("dashboard")} onAdd={openNewMaintenanceModal} onDelete={deleteMaintenanceOrder} onEdit={openEditMaintenanceModal} />}
                  {currentPage === "attendance" && <AttendancePage attendance={filteredData.attendance} companies={filteredData.companies} roles={filteredData.roles} onBack={() => setCurrentPage("dashboard")} onAddPresence={() => setAttendanceModal(true)} onAddCompany={() => setCompanyModal(true)} onAddRole={() => setRoleModal(true)} onDeletePresence={deleteAttendanceRecord} onDeleteCompany={deleteCompany} onDeleteRole={deleteRole} />}
                  {currentPage === "history" && <HistoryPage history={filteredData.history} companies={filteredData.companies} roles={filteredData.roles} stockCatalog={data.stockCatalog} stockMovements={data.stockMovements} onBack={() => setCurrentPage("dashboard")} obraAtual={obraAtual} />}
                </motion.div>
              </AnimatePresence>
            )}
          </main>
        </div>
      </div>

      <Modal open={obraModal} title="Cadastro de obras" onClose={() => setObraModal(false)}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome da obra"><Input value={obraForm.nome} onChange={(e) => setObraForm((prev) => ({ ...prev, nome: e.target.value }))} /></Field>
            <Field label="Cliente"><Input value={obraForm.cliente} onChange={(e) => setObraForm((prev) => ({ ...prev, cliente: e.target.value }))} /></Field>
            <Field label="Local"><Input value={obraForm.local} onChange={(e) => setObraForm((prev) => ({ ...prev, local: e.target.value }))} /></Field>
            <Field label="Status"><SelectField value={obraForm.status} onChange={(value) => setObraForm((prev) => ({ ...prev, status: value }))} options={[{ value: "Ativa", label: "Ativa" }, { value: "Pausada", label: "Pausada" }, { value: "Concluída", label: "Concluída" }]} /></Field>
            <Field label="Data de início"><Input type="date" value={obraForm.dataInicio} onChange={(e) => setObraForm((prev) => ({ ...prev, dataInicio: e.target.value }))} /></Field>
            <Field label="Observação"><Input value={obraForm.observacao} onChange={(e) => setObraForm((prev) => ({ ...prev, observacao: e.target.value }))} /></Field>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setObraModal(false)}>Fechar</Button>
            <Button onClick={addObra} disabled={!obraForm.nome}>Salvar obra</Button>
          </div>
          <Card>
            <CardHeader title="Obras cadastradas" />
            <div className="p-5 space-y-3">
              {data.obras.map((obra) => (
                <div key={obra.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-900">{obra.nome}</p>
                    <p className="text-sm text-slate-500">{obra.cliente} • {obra.local}</p>
                  </div>
                  <Badge className="bg-white text-slate-700 border-slate-300">{obra.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Modal>

      <Modal open={Boolean(observationModalItem)} title={observationModalItem ? `Observações da OS ${observationModalItem.os}` : "Observações"} onClose={() => setObservationModalItem(null)}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Serviço</p>
              <p className="mt-1 font-semibold text-slate-900">{observationModalItem?.service || "-"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Responsável</p>
              <p className="mt-1 font-semibold text-slate-900">{observationModalItem?.responsible || "-"}</p>
            </div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 min-h-[180px] whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {observationModalItem?.observacao || "Sem observações registradas."}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setObservationModalItem(null)}>Fechar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={attendanceModal} title="Lançar presença" onClose={() => setAttendanceModal(false)}>
        <div className="space-y-5">
          <Field label="Empresa">
            <SelectField value={attendanceBatchCompanyId} onChange={(value) => { setAttendanceBatchCompanyId(value); setAttendanceBatchQuantities({}); }} options={[{ value: "", label: "Selecione..." }, ...filteredData.companies.map((c) => ({ value: String(c.id), label: c.name }))]} />
          </Field>
          {attendanceBatchCompanyId ? (
            <div className="overflow-hidden rounded-[24px] border border-slate-200">
              <table className="w-full border-collapse">
                <thead><tr className="bg-slate-100"><th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-bold text-slate-900">CARGO/FUNÇÃO</th><th className="border-b border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-900 w-40">PRESENTE</th></tr></thead>
                <tbody>
                  {selectedAttendanceRoles.length ? selectedAttendanceRoles.map((role) => (
                    <tr key={role.id}>
                      <td className="border-b border-slate-200 px-4 py-3 text-base text-slate-800">{role.name}</td>
                      <td className="border-b border-slate-200 px-4 py-3"><input type="number" min="0" value={attendanceBatchQuantities[role.id] ?? 0} onChange={(e) => setAttendanceBatchQuantities((prev) => ({ ...prev, [role.id]: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-center text-base outline-none focus:border-emerald-500" /></td>
                    </tr>
                  )) : <tr><td colSpan={2} className="px-4 py-4 text-center text-slate-500">Nenhuma função cadastrada para esta empresa.</td></tr>}
                  <tr className="bg-slate-100"><td className="px-4 py-3 text-right text-xl font-extrabold text-slate-900">TOTAL</td><td className="px-4 py-3 text-center text-2xl font-extrabold text-slate-900">{attendanceBatchTotal}</td></tr>
                </tbody>
              </table>
            </div>
          ) : null}
          <div className="mt-5 flex justify-end gap-3"><Button variant="outline" onClick={() => setAttendanceModal(false)}>Cancelar</Button><Button onClick={addAttendanceRecord} disabled={!attendanceBatchCompanyId}>Salvar tudo</Button></div>
        </div>
      </Modal>

      <Modal open={companyModal} title="Nova empresa" onClose={() => setCompanyModal(false)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nome da empresa"><Input value={companyForm.name} onChange={(e) => setCompanyForm((prev) => ({ ...prev, name: e.target.value }))} /></Field>
          <Field label="Cidade / UF"><Input value={companyForm.city} onChange={(e) => setCompanyForm((prev) => ({ ...prev, city: e.target.value }))} /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-3"><Button variant="outline" onClick={() => setCompanyModal(false)}>Cancelar</Button><Button onClick={addCompany} disabled={!companyForm.name || !obraAtual}>Salvar</Button></div>
      </Modal>

      <Modal open={roleModal} title="Nova função / cargo" onClose={() => setRoleModal(false)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Empresa"><SelectField value={roleForm.companyId} onChange={(value) => setRoleForm((prev) => ({ ...prev, companyId: value }))} options={[{ value: "", label: "Selecione..." }, ...filteredData.companies.map((company) => ({ value: String(company.id), label: company.name }))]} /></Field>
          <Field label="Cargo / função"><Input value={roleForm.name} onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))} /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-3"><Button variant="outline" onClick={() => setRoleModal(false)}>Cancelar</Button><Button onClick={addRole} disabled={!roleForm.companyId || !roleForm.name || !obraAtual}>Salvar</Button></div>
      </Modal>


<Modal open={stockModal} title="Cadastro de item do almoxarifado" onClose={() => { setStockModal(false); resetStockForm(); }}>
  <div className="space-y-5">
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <Field label="Categoria">
        <SelectField
          value={stockForm.category}
          onChange={(value) => setStockForm((prev) => ({ ...prev, category: value, catalogCode: "", customItemName: "" }))}
          options={[
            { value: "", label: "Selecione..." },
            ...data.stockCategories.map((category) => ({
              value: category.name,
              label: `${category.prefix} • ${category.name}`,
            })),
          ]}
        />
      </Field>

      <Field label="Material catalogado">
        <SelectField
          value={stockForm.catalogCode}
          onChange={(value) => setStockForm((prev) => ({ ...prev, catalogCode: value }))}
          options={[
            { value: "", label: stockForm.category ? "Selecione..." : "Escolha a categoria primeiro" },
            ...(stockForm.category ? materialsForSelectedStockCategory.map((item) => ({
              value: item.code,
              label: `${item.code} • ${item.name}`,
            })) : []),
            ...(stockForm.category ? [{ value: "__new__", label: `Novo item da categoria (${nextCustomStockCode || "código automático"})` }] : []),
          ]}
        />
      </Field>

      <Field label="Código">
        <Input
          value={
            stockForm.catalogCode === "__new__"
              ? nextCustomStockCode
              : data.stockCatalog.find((item) => item.code === stockForm.catalogCode)?.code || ""
          }
          readOnly
        />
      </Field>

      {stockForm.catalogCode === "__new__" ? (
        <Field label="Descrição do novo item">
          <Input value={stockForm.customItemName} onChange={(e) => setStockForm((prev) => ({ ...prev, customItemName: e.target.value }))} />
        </Field>
      ) : null}

      <Field label="Unidade">
        <Input value={stockForm.unit} onChange={(e) => setStockForm((prev) => ({ ...prev, unit: e.target.value }))} />
      </Field>
      <Field label="Saldo inicial">
        <Input type="number" value={stockForm.quantity} onChange={(e) => setStockForm((prev) => ({ ...prev, quantity: e.target.value }))} />
      </Field>
      <Field label="Estoque mínimo">
        <Input type="number" value={stockForm.min} onChange={(e) => setStockForm((prev) => ({ ...prev, min: e.target.value }))} />
      </Field>
      <Field label="Nota fiscal">
        <Input value={stockForm.invoice} onChange={(e) => setStockForm((prev) => ({ ...prev, invoice: e.target.value }))} />
      </Field>
      <Field label="Valor unitário (R$)">
        <Input type="number" step="0.01" value={stockForm.price} onChange={(e) => setStockForm((prev) => ({ ...prev, price: e.target.value }))} />
      </Field>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      O item será codificado conforme a categoria selecionada. Materiais novos entram no catálogo local e seguem junto no backup do sistema.
    </div>

    <div className="mt-5 flex justify-end gap-3">
      <Button variant="outline" onClick={() => { setStockModal(false); resetStockForm(); }}>Cancelar</Button>
      <Button onClick={addStockItem} disabled={!stockForm.category || !stockForm.catalogCode || !(stockForm.catalogCode !== "__new__" || stockForm.customItemName.trim()) || !obraAtual}>Salvar</Button>
    </div>
  </div>
</Modal>

<Modal open={stockMovementModal} title={selectedStockItem ? `${stockMovementType === "entrada" ? "Entrada" : "Saída"} de material` : "Movimentação"} onClose={() => { setStockMovementModal(false); setSelectedStockItem(null); }}>
  <div className="space-y-5">
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">Item</p>
      <p className="mt-1 font-semibold text-slate-900">
        {selectedStockItem ? `${getStockItemCode(selectedStockItem, data.stockCatalog)} • ${selectedStockItem.item}` : "-"}
      </p>
      <p className="mt-1 text-sm text-slate-500">Saldo atual: {selectedStockItem?.quantity || 0} {selectedStockItem?.unit || ""}</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Data">
        <Input type="date" value={stockMovementForm.date} onChange={(e) => setStockMovementForm((prev) => ({ ...prev, date: e.target.value }))} />
      </Field>
      <Field label="Quantidade">
        <Input type="number" min="1" value={stockMovementForm.quantity} onChange={(e) => setStockMovementForm((prev) => ({ ...prev, quantity: e.target.value }))} />
      </Field>
      <Field label="Responsável">
        <Input value={stockMovementForm.responsible} onChange={(e) => setStockMovementForm((prev) => ({ ...prev, responsible: e.target.value }))} />
      </Field>
    </div>

    <Field label="Observação">
      <Textarea value={stockMovementForm.observacao} onChange={(e) => setStockMovementForm((prev) => ({ ...prev, observacao: e.target.value }))} placeholder="Ex.: retirada para frente de serviço do 2º pavimento." />
    </Field>

    <div className="mt-5 flex justify-end gap-3">
      <Button variant="outline" onClick={() => { setStockMovementModal(false); setSelectedStockItem(null); }}>Cancelar</Button>
      <Button onClick={addStockMovement}>{stockMovementType === "entrada" ? "Salvar entrada" : "Salvar saída"}</Button>
    </div>
  </div>
</Modal>

<Modal open={stockHistoryModal} title={selectedStockItem ? `Histórico • ${getStockItemCode(selectedStockItem, data.stockCatalog)} • ${selectedStockItem.item}` : "Histórico do item"} onClose={() => { setStockHistoryModal(false); setSelectedStockItem(null); }}>
  <div className="space-y-4">
    {selectedStockHistory.length ? (
      <div className="space-y-3">
        {selectedStockHistory.map((movement) => (
          <div key={movement.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{movement.type === "entrada" ? "Entrada" : "Saída"} de {movement.quantity} {selectedStockItem?.unit || ""}</p>
                <p className="text-sm text-slate-500 mt-1">{formatDateBR(movement.date)} • {movement.responsible || "Sem responsável informado"}</p>
              </div>
              <Badge className={movement.type === "entrada" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"}>
                Saldo {movement.previousQuantity} → {movement.nextQuantity}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap">{movement.observacao || "Sem observação."}</p>
          </div>
        ))}
      </div>
    ) : (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-slate-500">
        Nenhuma movimentação registrada para este item.
      </div>
    )}

    <div className="flex justify-end">
      <Button variant="outline" onClick={() => { setStockHistoryModal(false); setSelectedStockItem(null); }}>Fechar</Button>
    </div>
  </div>
</Modal>

<Modal open={stockCategoryModal} title="Categorias do almoxarifado" onClose={() => setStockCategoryModal(false)}>
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_160px_auto] gap-4">
      <Field label="Nome da categoria">
        <Input value={stockCategoryForm.name} onChange={(e) => setStockCategoryForm((prev) => ({ ...prev, name: e.target.value }))} />
      </Field>
      <Field label="Prefixo">
        <Input value={stockCategoryForm.prefix} maxLength={4} onChange={(e) => setStockCategoryForm((prev) => ({ ...prev, prefix: e.target.value.toUpperCase() }))} />
      </Field>
      <div className="flex items-end">
        <Button className="w-full" onClick={addStockCategory}>Cadastrar categoria</Button>
      </div>
    </div>

    <Card>
      <CardHeader title="Categorias cadastradas" description="Base inicial importada da sua planilha de códigos, com possibilidade de cadastrar e descadastrar." />
      <div className="p-5 space-y-3">
        {data.stockCategories
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
          .map((category) => {
            const materialCount = data.stockCatalog.filter((item) => item.category === category.name).length;
            const stockCount = data.stock.filter((item) => item.category === category.name).length;

            return (
              <div key={category.name} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-900">{category.prefix} • {category.name}</p>
                  <p className="text-sm text-slate-500 mt-1">{materialCount} materiais no catálogo • {stockCount} itens em estoque</p>
                </div>
                <Button variant="danger" className="h-9 px-3 rounded-xl" onClick={() => deleteStockCategory(category.name)}>Descadastrar</Button>
              </div>
            );
          })}
      </div>
    </Card>
  </div>
</Modal>

      <Modal open={maintenanceModal} title={editingMaintenanceId ? "Editar manutenção" : "Nova manutenção"} onClose={() => { setMaintenanceModal(false); resetMaintenanceForm(); }}>
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <Field label="OS"><Input value={maintenanceForm.os} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, os: e.target.value }))} /></Field>
            <Field label="Serviço"><Input value={maintenanceForm.service} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, service: e.target.value }))} /></Field>
            <Field label="Solicitante"><Input value={maintenanceForm.requester} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, requester: e.target.value }))} /></Field>
            <Field label="Data solicitação"><Input type="date" value={maintenanceForm.requestDate} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, requestDate: e.target.value, limitDate: addDaysISO(e.target.value, 7) }))} /></Field>
            <Field label="Data realização do serviço"><Input type="date" value={maintenanceForm.realizationDate} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, realizationDate: e.target.value }))} /></Field>
            <Field label="Data entrega"><Input type="date" value={maintenanceForm.deliveryDate} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, deliveryDate: e.target.value }))} /></Field>
            <Field label="Custo do serviço (R$)"><Input type="number" step="0.01" value={maintenanceForm.cost} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, cost: e.target.value }))} /></Field>
            <Field label="Data limite"><Input type="date" value={maintenanceForm.limitDate} readOnly /></Field>
            <Field label="Responsável"><Input value={maintenanceForm.responsible} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, responsible: e.target.value }))} /></Field>
          </div>
          <Field label="Observações">
            <Textarea value={maintenanceForm.observacao} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, observacao: e.target.value }))} placeholder="Registre detalhes importantes da OS, restrições, contexto ou orientações para execução." />
          </Field>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setMaintenanceModal(false); resetMaintenanceForm(); }}>Cancelar</Button>
            <Button onClick={addMaintenanceOrder} disabled={!maintenanceForm.os || !maintenanceForm.service || !(editingMaintenanceObraId || obraAtual)}>
              {editingMaintenanceId ? "Salvar alterações" : "Salvar"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
