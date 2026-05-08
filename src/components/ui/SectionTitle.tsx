import estilos from "./SectionTitle.module.scss";

interface SectionTitleProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  light?: boolean;
  id?: string;
}

function SectionTitle({ eyebrow, title, subtitle, light = false, id }: SectionTitleProps) {
  return (
    <header className={`${estilos["cabecera-seccion"]} ${light ? estilos["cabecera-seccion--clara"] : ""}`}>
      {eyebrow ? <p className={estilos["cabecera-seccion__ceja"]}>{eyebrow}</p> : null}
      <h2 id={id} className={estilos["cabecera-seccion__titulo"]}>
        {title}
      </h2>
      {subtitle ? <p className={estilos["cabecera-seccion__subtitulo"]}>{subtitle}</p> : null}
    </header>
  );
}

export default SectionTitle;
