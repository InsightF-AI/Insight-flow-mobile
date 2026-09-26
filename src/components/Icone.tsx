import {
  Activity,
  Bell,
  BellOff,
  ChartPie,
  Circle,
  CircleAlert,
  CirclePlus,
  Eye,
  EyeOff,
  Inbox,
  Info,
  List,
  Lock,
  Mail,
  MessageSquare,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Trash,
  TrendingUp,
  User,
  Wallet,
} from 'lucide-react-native';

import type { ColorValue } from 'react-native';

import type { Cores } from '@/theme/cores';
import { useTema } from '@/theme/useTema';

const ICONES = {
  atividade: Activity,
  erro: CircleAlert,
  sino: Bell,
  'sino-desligado': BellOff,
  circulo: Circle,
  olho: Eye,
  'olho-fechado': EyeOff,
  'caixa-vazia': Inbox,
  info: Info,
  lista: List,
  cadeado: Lock,
  email: Mail,
  mensagem: MessageSquare,
  lua: Moon,
  'grafico-pizza': ChartPie,
  mais: Plus,
  'mais-circulo': CirclePlus,
  atualizar: RefreshCw,
  busca: Search,
  brilho: Sparkles,
  estrela: Star,
  lixeira: Trash,
  tendencia: TrendingUp,
  usuario: User,
  carteira: Wallet,
} as const;

export type NomeIcone = keyof typeof ICONES;

export const NOMES_DE_ICONES = Object.keys(ICONES) as NomeIcone[];

interface Props {
  nome: NomeIcone;
  tamanho?: number;
  /** Token de cor do tema. */
  cor?: keyof Cores;
  /** Só para cores que o navegador entrega já resolvidas a partir dos tokens (ex.: ícone de aba). */
  corExata?: ColorValue;
  espessura?: number;
}

/** Ícone lucide (o mesmo conjunto do web) sempre com cor vinda do tema. Decorativo: oculto para leitores de tela. */
export function Icone({ nome, tamanho = 20, cor = 'texto', corExata, espessura = 2 }: Props) {
  const { cores } = useTema();
  const Componente = ICONES[nome];
  return (
    <Componente
      testID={`icone-${nome}`}
      aria-hidden
      size={tamanho}
      color={corExata ?? cores[cor]}
      strokeWidth={espessura}
    />
  );
}
