import Image from "next/image";

export function ArkLogo({
  className = "",
}: {
  className?: string;
}) {
  const src = "/arkadians-clearlogo-alpha.png";

  return (
    <div aria-label="The Arkadians">
      <Image
        src={src}
        alt="The Arkadians"
        width={520}
        height={180}
        priority
        className={className || "h-12 w-auto"}
      />
    </div>
  );
}

