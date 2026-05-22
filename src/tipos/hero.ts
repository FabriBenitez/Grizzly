export interface DiapositivaHero {
  id: string;
  image: string;
  title?: string;
  kicker: string;
  titleLead: string;
  titleHighlight: string;
  titleTail: string;
  description: string;
  badges: string[];
  stats: string[];
  ctaLabel?: string;
  ctaHref?: string;
  showOverlay: boolean;
  active: boolean;
  order: number;
}
