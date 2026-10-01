import React, { useId } from 'react';

interface EmblemProps {
  className?: string;
  size?: number;
}

/**
 * Emblema Oficial Korizko ( Brasão Circular Dourado Champagne )
 * Reprodução vetorial fiel da arte oficial Korizko.
 */
export const KorizkoEmblem: React.FC<EmblemProps> = ({ className = '', size = 96 }) => {
  const uid = useId().replace(/:/g, '');
  const gradMain = `korizko-gold-main-${uid}`;
  const gradSoft = `korizko-gold-soft-${uid}`;
  const glowFilter = `korizko-glow-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none shrink-0 ${className}`}
      aria-label="Emblema Korizko"
    >
      <defs>
        <linearGradient id={gradMain} x1="25" y1="15" x2="215" y2="225" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F6DFC6" />
          <stop offset="28%" stopColor="#DEB284" />
          <stop offset="55%" stopColor="#C59262" />
          <stop offset="78%" stopColor="#EBC69E" />
          <stop offset="100%" stopColor="#946237" />
        </linearGradient>

        <linearGradient id={gradSoft} x1="60" y1="30" x2="190" y2="210" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F8E5CE" />
          <stop offset="50%" stopColor="#CFA070" />
          <stop offset="100%" stopColor="#8E5C32" />
        </linearGradient>

        <filter id={glowFilter} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Arco Circular Esquerdo e Superior */}
      <path
        d="M 53 158 A 86 86 0 0 1 125 34"
        stroke={`url(#${gradMain})`}
        strokeWidth="2.3"
        strokeLinecap="round"
      />

      {/* Arco Circular Direito */}
      <path
        d="M 157 45 A 86 86 0 0 1 197 156"
        stroke={`url(#${gradMain})`}
        strokeWidth="2.3"
        strokeLinecap="round"
      />

      {/* Coroa Real (4 pontas com ponta principal ultrapassando o arco) */}
      <path
        d="M 106 72
           C 117 69, 136 74, 154 92
           L 164 62
           L 151 74
           L 157 41
           L 139 64
           L 142 20
           L 122 59
           L 115 47
           L 111 66
           Z"
        fill={`url(#${gradMain})`}
      />
      {/* Detalhe vazado interno na coroa e faixa da base */}
      <path
        d="M 136 56 L 140 49 L 142 58 L 137 60 Z"
        fill="#070709"
      />
      <path
        d="M 104 76 C 118 71, 138 78, 154 97"
        stroke="#070709"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M 104 79 C 118 74, 137 81, 152 99"
        stroke={`url(#${gradSoft})`}
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Rosto em Perfil (Testa, Nariz, Lábios e Queixo) */}
      <path
        d="M 108 79
           C 105 84, 106 90, 101 98
           C 99 101, 100 103, 104 104
           C 103 107, 102 109, 105 111"
        stroke={`url(#${gradMain})`}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Queixo e linha da mandíbula */}
      <path
        d="M 105 125
           C 105 129, 109 131, 117 129"
        stroke={`url(#${gradMain})`}
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Cabelo e Manto Real Fluido à Direita */}
      <path
        d="M 116 79
           C 127 84, 133 102, 143 118
           C 153 134, 168 139, 178 156
           C 164 146, 151 142, 139 128
           C 128 114, 123 95, 113 83 Z"
        fill={`url(#${gradMain})`}
      />
      {/* Mecha de cabelo posterior sob a coroa */}
      <path
        d="M 142 90
           C 149 102, 151 116, 156 129
           C 149 121, 145 108, 138 94 Z"
        fill={`url(#${gradSoft})`}
      />

      {/* Drapeado do Manto Real (Curvas inferiores direitas) */}
      <path
        d="M 110 207
           C 132 192, 148 164, 161 146
           C 169 146, 177 154, 185 173
           C 177 161, 169 154, 161 153
           C 149 172, 134 196, 110 207 Z"
        fill={`url(#${gradMain})`}
      />
      <path
        d="M 122 209
           C 143 196, 156 173, 168 159
           C 176 160, 184 169, 190 183
           C 182 172, 175 166, 168 165
           C 156 181, 142 200, 122 209 Z"
        fill={`url(#${gradSoft})`}
      />
      {/* Linha interna do busto */}
      <path
        d="M 109 148 C 102 162, 99 178, 99 195 C 103 180, 106 164, 112 151 Z"
        fill={`url(#${gradSoft})`}
      />

      {/* Pão Artesanal / Croissant Dourado */}
      <path
        d="M 75 116
           C 81 106, 95 103, 105 109
           C 111 113, 111 124, 103 129
           C 97 133, 91 134, 87 136
           C 91 129, 92 121, 86 116
           C 82 113, 78 114, 75 116 Z"
        fill={`url(#${gradMain})`}
      />
      {/* Gomos / Cortes do Pão Artesanal */}
      <path
        d="M 80 112 C 87 107, 96 108, 101 114"
        stroke="#070709"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M 74 118 C 81 113, 90 115, 95 122"
        stroke="#070709"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Mão Delicada Segurando o Pão */}
      <path
        d="M 55 172
           C 57 153, 62 135, 69 124
           C 75 119, 83 118, 89 120
           C 83 121, 76 123, 72 128
           C 78 125, 84 125, 89 127
           C 82 128, 76 130, 72 135
           C 77 133, 83 133, 87 135
           C 81 137, 75 140, 71 146
           C 69 152, 68 158, 74 159
           C 79 156, 83 151, 86 147
           C 82 155, 76 161, 70 164
           C 74 179, 81 194, 91 206
           C 79 196, 70 181, 66 165
           C 61 166, 58 169, 55 172 Z"
        fill={`url(#${gradMain})`}
      />
    </svg>
  );
};

interface FullLogoProps {
  className?: string;
  compact?: boolean;
  showMotto?: boolean;
}

/**
 * Logo Completa Oficial KORIZKO
 * Inclui o Brasão Real, tipografia KORIZKO com estrelas de 4 pontas nos 'O's e cauda caligráfica no 'K',
 * linha "PÃES ARTESANAIS • BOLOS • BROWNIES", estrela central e lema "O PRAZER TAMBÉM É UMA NECESSIDADE."
 */
export const KorizkoFullLogo: React.FC<FullLogoProps> = ({
  className = '',
  compact = false,
  showMotto = true,
}) => {
  const uid = useId().replace(/:/g, '');
  const textGrad = `korizko-wordmark-${uid}`;

  return (
    <div className={`flex flex-col items-center text-center select-none ${className}`}>
      {/* 1. Emblema Circular no Topo */}
      <div className="relative flex items-center justify-center">
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-25 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(216,170,123,0.45) 0%, rgba(216,170,123,0) 72%)',
          }}
        />
        <KorizkoEmblem size={compact ? 88 : 124} />
      </div>

      {/* 2. Tipografia Principal KORIZKO (com cauda no K e estrelas ✦ dentro dos dois O's) */}
      <div className="w-full max-w-[420px] -mt-1">
        <svg
          viewBox="0 0 680 128"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto overflow-visible"
          role="img"
          aria-label="KORIZKO"
        >
          <defs>
            <linearGradient id={textGrad} x1="40" y1="10" x2="640" y2="115" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F5DEC4" />
              <stop offset="22%" stopColor="#CFA072" />
              <stop offset="48%" stopColor="#F2D6B8" />
              <stop offset="75%" stopColor="#B98554" />
              <stop offset="100%" stopColor="#E9C39B" />
            </linearGradient>
          </defs>

          {/* Letra K (primeira) com cauda longa sob o primeiro O */}
          <path
            d="M 30 20 H 54 V 23 C 48 23, 46 26, 46 33 V 83 C 46 90, 48 93, 54 93 V 96 H 30 V 93 C 35 93, 37 90, 37 83 V 33 C 37 26, 35 23, 30 23 Z"
            fill={`url(#${textGrad})`}
          />
          {/* Braço superior do K1 */}
          <path
            d="M 46 58 L 84 28 C 88 25, 88 23, 82 23 V 20 H 105 V 23 C 98 23, 93 26, 86 32 L 55 57 Z"
            fill={`url(#${textGrad})`}
          />
          {/* Perna inferior do K1 + Cauda Caligráfica longa sob o O */}
          <path
            d="M 52 52 C 60 52, 67 56, 75 66 L 96 91 C 107 104, 122 114, 146 117 C 160 119, 174 117, 185 114 C 173 121, 155 124, 136 121 C 113 118, 96 107, 82 90 L 58 61 C 54 56, 51 55, 46 56 Z"
            fill={`url(#${textGrad})`}
          />

          {/* Letra O (primeira) */}
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M 164 18 C 190 18, 210 35, 210 58 C 210 81, 190 98, 164 98 C 138 98, 118 81, 118 58 C 118 35, 138 18, 164 18 Z
               M 164 23 C 145 23, 130 38, 130 58 C 130 78, 145 93, 164 93 C 183 93, 198 78, 198 58 C 198 38, 183 23, 164 23 Z"
            fill={`url(#${textGrad})`}
          />
          {/* Estrela de 4 pontas dentro do primeiro O */}
          <path
            d="M 164 44 C 165.5 53, 169 56.5, 178 58 C 169 59.5, 165.5 63, 164 72 C 162.5 63, 159 59.5, 150 58 C 159 56.5, 162.5 53, 164 44 Z"
            fill={`url(#${textGrad})`}
          />

          {/* Letra R */}
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M 232 20 H 268 C 287 20, 298 29, 298 41 C 298 52, 289 60, 275 62 L 300 88 C 304 92, 307 93, 312 93 V 96 H 294 L 265 63 H 251 V 83 C 251 90, 253 93, 259 93 V 96 H 232 V 93 C 238 93, 240 90, 240 83 V 33 C 240 26, 238 23, 232 23 V 20 Z
               M 251 25 V 58 H 265 C 279 58, 286 51, 286 41 C 286 31, 279 25, 265 25 H 251 Z"
            fill={`url(#${textGrad})`}
          />

          {/* Letra I */}
          <path
            d="M 332 20 H 360 V 23 C 354 23, 351 26, 351 33 V 83 C 351 90, 354 93, 360 93 V 96 H 332 V 93 C 338 93, 341 90, 341 83 V 33 C 341 26, 338 23, 332 23 V 20 Z"
            fill={`url(#${textGrad})`}
          />

          {/* Letra Z */}
          <path
            d="M 386 20 H 448 L 446 37 H 443 C 442 29, 438 25, 428 25 H 401 L 447 96 H 382 L 385 77 H 388 C 389 86, 394 91, 405 91 H 433 L 386 20 Z"
            fill={`url(#${textGrad})`}
          />

          {/* Letra K (segunda) */}
          <path
            d="M 472 20 H 496 V 23 C 490 23, 488 26, 488 33 V 83 C 488 90, 490 93, 496 93 V 96 H 472 V 93 C 477 93, 479 90, 479 83 V 33 C 479 26, 477 23, 472 23 V 20 Z"
            fill={`url(#${textGrad})`}
          />
          <path
            d="M 488 57 L 525 28 C 529 25, 529 23, 523 23 V 20 H 546 V 23 C 539 23, 534 26, 527 32 L 497 56 L 534 87 C 540 92, 544 93, 550 93 V 96 H 529 L 488 59 Z"
            fill={`url(#${textGrad})`}
          />

          {/* Letra O (segunda) */}
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M 606 18 C 632 18, 652 35, 652 58 C 652 81, 632 98, 606 98 C 580 98, 560 81, 560 58 C 560 35, 580 18, 606 18 Z
               M 606 23 C 587 23, 572 38, 572 58 C 572 78, 587 93, 606 93 C 625 93, 640 78, 640 58 C 640 38, 625 23, 606 23 Z"
            fill={`url(#${textGrad})`}
          />
          {/* Estrela de 4 pontas dentro do segundo O */}
          <path
            d="M 606 44 C 607.5 53, 611 56.5, 620 58 C 611 59.5, 607.5 63, 606 72 C 604.5 63, 601 59.5, 592 58 C 601 56.5, 604.5 53, 606 44 Z"
            fill={`url(#${textGrad})`}
          />
        </svg>
      </div>

      {/* 3. Linha PÃES ARTESANAIS • BOLOS • BROWNIES */}
      <div className="w-full max-w-[420px] flex items-center justify-center gap-3 mt-1 px-2">
        <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#C89B6E]/70 to-[#E8C39E]" />
        <span
          className="text-[10px] sm:text-[11px] uppercase tracking-[0.26em] text-[#E6C39F] whitespace-nowrap font-medium"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          PÃES ARTESANAIS <span className="mx-1 text-[#C89B6E]">•</span> BOLOS <span className="mx-1 text-[#C89B6E]">•</span> BROWNIES
        </span>
        <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#C89B6E]/70 to-[#E8C39E]" />
      </div>

      {/* Subtítulo Panificação confeitaria artesanal */}
      <span
        className="mt-1.5 text-[10px] tracking-[0.18em] uppercase text-[#C89B6E]/90 font-medium"
        style={{ fontFamily: "'Cinzel', serif" }}
      >
        Panificação confeitaria artesanal
      </span>

      {/* 4. Estrela Central + Lema "O PRAZER TAMBÉM É UMA NECESSIDADE." */}
      {showMotto && (
        <div className="flex flex-col items-center mt-2.5 space-y-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M12 2C13.2 8.8 15.2 10.8 22 12C15.2 13.2 13.2 15.2 12 22C10.8 15.2 8.8 13.2 2 12C8.8 10.8 10.8 8.8 12 2Z"
              fill="#D8AB7E"
            />
          </svg>

          <p
            className="text-xs sm:text-[13px] italic tracking-[0.28em] text-[#DFBE9B]/90 leading-relaxed uppercase"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            O PRAZER TAMBÉM É
            <br />
            UMA NECESSIDADE.
          </p>
        </div>
      )}
    </div>
  );
};
