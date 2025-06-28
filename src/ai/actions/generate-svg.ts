'use server';
/**
 * @fileOverview A server action to generate an SVG from a text description.
 */
import { ai } from '@/ai/genkit';

// This is the function that will be called from the client for each scene.
export async function generateSvg(description: string): Promise<string> {
  try {
    const designerPrompt = `Sen eğitimsel içerik görselleştiren bir uzmansın. Karmaşık kavramları basit metaforlar ve tanınabilir sembollerle anlatan SVG'ler oluşturuyorsun. HTML animasyonlarındaki gibi aşamalı hikaye anlatımı kullanıyorsun.

**Temel Yaklaşım:** 
- Kavramları günlük hayattan tanıdık objelerle açıkla (ev=mülkiyet, pasta=paylaşım, takvim=zaman, el sıkışma=anlaşma)
- Her görselde bir "hikaye" anlat, sadece statik resim değil
- Türkçe etiketler ve açıklamalar kullan
- Renklerle farklı kavramları ayır ve kod

**Metafor Rehberi:**
- 🏠 Ev simgesi → Mülkiyet, taşınmaz, ortaklık
- 🤝 El sıkışma → Anlaşma, arabuluculuk, uzlaşma  
- 📅 Takvim → Tarih, süreç, zaman çizelgesi
- 🥧 Pasta grafiği → Paylaşım, hisseler, bölüştürme
- ⚖️ Terazi → Adalet, hukuk, mahkeme
- 👥 İnsan figürleri → Taraflar, ortaklar, mirasçılar
- 💰 Para simgesi → Maddi değer, tazminat, satış
- 📋 Belgeler → Sözleşme, dava, anlaşma

**Görsel Tarz:**
*   **Eğitimsel Animasyon Tarzı:** HTML kodundaki gibi basit ama anlamlı şekiller
*   **Renk Kodlaması:** \`fill="hsl(var(--primary))"\` mavi (hukuki), \`fill="hsl(var(--destructive))"\` kırmızı (sorun), \`fill="hsl(var(--constructive))"\` yeşil (çözüm), \`fill="#ffd700"\` altın (önemli)
*   **Şeffaf Arkaplan:** SVG root elementinde arkaplan rengi olmasın
*   **Türkçe Metin:** Açıklayıcı etiketler ve başlıklar ekle

**Örnek Senaryo:**
*   **Sahne Açıklaması:** "Ortaklar arasında mülkiyet anlaşmazlığı"
*   **Senin Çıktın:** Ortada bir ev (mülkiyet), iki yanında insan figürleri (ortaklar), aralarında kırmızı ünlem işareti (anlaşmazlık), altında terazi (hukuki çözüm). Türkçe etiketler: "Ortak 1", "Ortak 2", "Mülkiyet Anlaşmazlığı"

**Hikaye Anlatımı:**
- Senaryodaki olayları adım adım göster
- Sebep-sonuç ilişkilerini görsel ok ve bağlantılarla belirt  
- Her elementin ne anlama geldiğini Türkçe etiketle
- Zaman akışını soldan sağa veya yukarıdan aşağı göster

**Teknik Gereksinimler:**
*   **Sadece SVG:** Tüm yanıtın sadece SVG kodu olsun. \`<svg ...>\` ile başla, \`</svg>\` ile bitir
*   **Doğru Boyutlandırma:** width="500" height="300" viewBox="0 0 500 300" kullan
*   **Sınırlar İçinde:** TÜM elementler viewBox sınırları içinde kalmalı (x: 0-500, y: 0-300)
*   **Güvenli Alan:** Kenarlarda 20px boşluk bırak (x: 20-480, y: 20-280)
*   **Metin Taşması:** Uzun metinler için font-size küçült veya satır başı yap
*   **Görünür Elementler:** \`<path>\`, \`<rect>\`, \`<circle>\` gibi çizim elementleri MUTLAKA olsun
*   **Geçerli XML:** İyi formatlanmış SVG, \`viewBox\` attribute'u ile
*   **Tema Renkleri:** CSS değişkenleri kullan

**Şimdi şu sahne için eğitimsel bir SVG oluştur:**
${description}`;

    const svgGenerationResponse = await ai.generate({ prompt: designerPrompt, model: 'googleai/gemini-2.5-flash' });
    const svgCode = svgGenerationResponse.text;
    
    if (typeof svgCode !== 'string') {
      throw new Error('SVG generation returned a non-text response.');
    }

    const svgMatch = svgCode.match(/<svg[\s\S]*?<\/svg>/);
    if (!svgMatch) {
      throw new Error("SVG generation failed: No SVG tag found in response.");
    }

    const extractedSvg = svgMatch[0];
    const hasDrawingElements = /<path|<rect|<circle|<ellipse|<polygon|<polyline|<line/i.test(extractedSvg);
    const hasThemeColors = extractedSvg.includes('hsl(var');

    if (hasDrawingElements && hasThemeColors) {
        return extractedSvg;
    }
    
    throw new Error("SVG generation failed: Validation checks failed.");

  } catch (error) {
    console.error(`SVG generation failed for description "${description}":`, error);
    
    // Create a more visual fallback SVG based on description keywords
    const createFallbackSvg = (desc: string): string => {
      // Extract keywords for visual elements
      const hasSpace = desc.toLowerCase().includes('uzay') || desc.toLowerCase().includes('gezegen') || desc.toLowerCase().includes('güneş');
      const hasLegal = desc.toLowerCase().includes('dava') || desc.toLowerCase().includes('hukuk') || desc.toLowerCase().includes('mahkeme');
      const hasEducation = desc.toLowerCase().includes('eğitim') || desc.toLowerCase().includes('öğretim') || desc.toLowerCase().includes('ders');
      const hasBusiness = desc.toLowerCase().includes('iş') || desc.toLowerCase().includes('şirket') || desc.toLowerCase().includes('ticaret');
      
      let elements = '';
      let title = 'Eğitici Görsel';
      
      if (hasSpace) {
        title = 'Uzay ve Gezegenler';
        elements = `
          <circle cx="250" cy="150" r="30" fill="hsl(var(--primary))" opacity="0.8"/>
          <text x="250" y="155" text-anchor="middle" fill="white" font-size="12">Güneş</text>
          <circle cx="150" cy="150" r="8" fill="hsl(var(--secondary))"/>
          <circle cx="200" cy="150" r="12" fill="hsl(var(--accent))"/>
          <circle cx="300" cy="150" r="10" fill="hsl(var(--destructive))"/>
          <circle cx="350" cy="150" r="15" fill="hsl(var(--constructive))"/>
          <text x="250" y="220" text-anchor="middle" font-size="14">Güneş Sistemi</text>
        `;
      } else if (hasLegal) {
        title = 'Hukuki Süreç';
        elements = `
          <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0, 10 3, 0 6" fill="hsl(var(--foreground))"/></marker></defs>
          <rect x="50" y="100" width="80" height="40" fill="hsl(var(--primary))" rx="5"/>
          <text x="90" y="125" text-anchor="middle" fill="white" font-size="12">Dava</text>
          <path d="M140 120 L180 120" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
          <rect x="190" y="100" width="80" height="40" fill="hsl(var(--secondary))" rx="5"/>
          <text x="230" y="125" text-anchor="middle" fill="white" font-size="12">Mahkeme</text>
          <path d="M280 120 L320 120" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
          <rect x="330" y="100" width="80" height="40" fill="hsl(var(--constructive))" rx="5"/>
          <text x="370" y="125" text-anchor="middle" fill="white" font-size="12">Karar</text>
        `;
      } else if (hasEducation) {
        title = 'Eğitim Süreci';
        elements = `
          <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0, 10 3, 0 6" fill="hsl(var(--foreground))"/></marker></defs>
          <rect x="100" y="80" width="300" height="140" fill="hsl(var(--muted))" stroke="hsl(var(--border))" stroke-width="2" rx="10"/>
          <circle cx="150" cy="120" r="20" fill="hsl(var(--primary))"/>
          <text x="150" y="125" text-anchor="middle" fill="white" font-size="12">1</text>
          <circle cx="250" cy="120" r="20" fill="hsl(var(--secondary))"/>
          <text x="250" y="125" text-anchor="middle" fill="white" font-size="12">2</text>
          <circle cx="350" cy="120" r="20" fill="hsl(var(--accent))"/>
          <text x="350" y="125" text-anchor="middle" fill="white" font-size="12">3</text>
          <text x="150" y="160" text-anchor="middle" font-size="10">Öğrenme</text>
          <text x="250" y="160" text-anchor="middle" font-size="10">Uygulama</text>
          <text x="350" y="160" text-anchor="middle" font-size="10">Değerlendirme</text>
          <path d="M170 120 L230 120" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
          <path d="M270 120 L330 120" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
        `;
      } else if (hasBusiness) {
        title = 'İş Süreci';
        elements = `
          <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0, 10 3, 0 6" fill="hsl(var(--foreground))"/></marker></defs>
          <rect x="50" y="50" width="400" height="200" fill="hsl(var(--muted))" stroke="hsl(var(--border))" stroke-width="2" rx="10"/>
          <rect x="80" y="100" width="60" height="40" fill="hsl(var(--primary))" rx="5"/>
          <text x="110" y="125" text-anchor="middle" fill="white" font-size="11">Başlangıç</text>
          <rect x="180" y="100" width="60" height="40" fill="hsl(var(--secondary))" rx="5"/>
          <text x="210" y="125" text-anchor="middle" fill="white" font-size="11">Süreç</text>
          <rect x="280" y="100" width="60" height="40" fill="hsl(var(--accent))" rx="5"/>
          <text x="310" y="125" text-anchor="middle" fill="white" font-size="11">Sonuç</text>
          <rect x="380" y="100" width="60" height="40" fill="hsl(var(--constructive))" rx="5"/>
          <text x="410" y="125" text-anchor="middle" fill="white" font-size="11">Tamamlama</text>
          <path d="M150 120 L170 120" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
          <path d="M250 120 L270 120" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
          <path d="M350 120 L370 120" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
        `;
      } else {
        // Generic educational visual
        elements = `
          <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0, 10 3, 0 6" fill="hsl(var(--foreground))"/></marker></defs>
          <rect x="100" y="100" width="300" height="100" fill="hsl(var(--muted))" stroke="hsl(var(--border))" stroke-width="2" rx="10"/>
          <circle cx="150" cy="150" r="25" fill="hsl(var(--primary))"/>
          <text x="150" y="155" text-anchor="middle" fill="white" font-size="12">?</text>
          <circle cx="250" cy="150" r="25" fill="hsl(var(--secondary))"/>
          <text x="250" y="155" text-anchor="middle" fill="white" font-size="12">!</text>
          <circle cx="350" cy="150" r="25" fill="hsl(var(--accent))"/>
          <text x="350" y="155" text-anchor="middle" fill="white" font-size="12">✓</text>
          <path d="M175 150 L225 150" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
          <path d="M275 150 L325 150" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
        `;
      }
      
      return `<svg width="500" height="300" viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="hsl(var(--background))"/>
        ${elements}
        <text x="250" y="270" text-anchor="middle" fill="hsl(var(--muted-foreground))" font-size="12">${title}</text>
        <text x="250" y="30" text-anchor="middle" fill="hsl(var(--foreground))" font-size="14" font-weight="bold">Görsel oluşturuluyor...</text>
      </svg>`;
    };
    
    return createFallbackSvg(description);
  }
}

// New function specifically for generating diagrams/flowcharts/mindmaps
export async function generateDiagram(description: string): Promise<string> {
  try {
    const diagramPrompt = `Sen profesyonel diyagram uzmanısın. Eğitimsel akış şemaları, zihin haritaları ve yapısal diyagramlar oluşturuyorsun. HTML animasyonlarındaki gibi kavramları net ve anlaşılır şekilde gösteriyorsun.

**Diyagram Yaklaşımı:**
- Akış şemaları, zihin haritaları, organizasyon şemaları oluştur
- Geometrik şekilleri (dikdörtgen, daire, elmas) ok ve çizgilerle bağla
- Türkçe etiketler ve açıklamalar kullan
- Kavramlar arası ilişkileri ve akışı göster
- Basit ve eğitimsel olsun

**Şekil Rehberi:**
- 📦 Dikdörtgen → Süreç, kavram, adım
- 🔵 Daire → Başlangıç, bitiş noktası
- 💎 Elmas → Karar verme, seçenek
- ➡️ Oklar → Akış, yön, ilişki
- 📋 Metin etiketleri → Her element için açıklama

**Görsel Tarz:**
*   **Temiz Yapı:** Geometrik şekiller, net çizgiler, uygun boşluklar
*   **Renk Kodlaması:** \`hsl(var(--primary))\` mavi, \`hsl(var(--secondary))\` ikincil, \`hsl(var(--accent))\` vurgu renkleri
*   **Tipografi:** Okunaklı Türkçe metin, uygun font boyutları
*   **Şeffaf Arkaplan:** SVG root elementinde arkaplan rengi olmasın

**Örnek Diyagram:**
*   **Konu:** "Hukuki süreç adımları"
*   **Çıktın:** Başlangıç dairesel şekli → "Arabuluculuk" dikdörtgeni → "Anlaşma var mı?" elması → İki yol: "Evet" (yeşil ok) → "Sözleşme", "Hayır" (kırmızı ok) → "Dava Süreci"

**Teknik Gereksinimler:**
*   **Sadece SVG:** Yanıtın tamamen SVG kodu olsun, açıklama yazma
*   **Doğru Boyutlandırma:** width="500" height="300" viewBox="0 0 500 300" kullan
*   **Sınırlar İçinde:** TÜM elementler viewBox sınırları içinde kalmalı (x: 0-500, y: 0-300)
*   **Güvenli Alan:** Kenarlarda 20px boşluk bırak (x: 20-480, y: 20-280)
*   **Metin Taşması:** Uzun metinler için font-size küçült veya satır başı yap
*   **Görünür Elementler:** \`<rect>\`, \`<circle>\`, \`<path>\`, \`<line>\` gibi şekiller MUTLAKA olsun
*   **Geçerli XML:** \`viewBox\` attribute'u olan düzgün SVG
*   **CSS Değişkenleri:** \`fill="hsl(var(--primary))"\` gibi tema renkleri kullan

**Şu konu için diyagram oluştur:**
${description}`;

    const diagramResponse = await ai.generate({ prompt: diagramPrompt, model: 'googleai/gemini-2.5-flash' });
    const svgCode = diagramResponse.text;
    
    if (typeof svgCode !== 'string') {
      throw new Error('Diagram generation returned a non-text response.');
    }

    const svgMatch = svgCode.match(/<svg[\s\S]*?<\/svg>/);
    if (!svgMatch) {
      throw new Error("Diagram generation failed: No SVG tag found in response.");
    }

    const extractedSvg = svgMatch[0];
    const hasDrawingElements = /<path|<rect|<circle|<ellipse|<polygon|<polyline|<line/i.test(extractedSvg);
    const hasThemeColors = extractedSvg.includes('hsl(var') || extractedSvg.includes('fill=');
    const hasValidSvg = extractedSvg.includes('viewBox') || extractedSvg.includes('width');

    // More lenient validation - accept if we have basic drawing elements
    if (hasDrawingElements || hasValidSvg) {
        console.log('Diagram validation passed:', { hasDrawingElements, hasThemeColors, hasValidSvg });
        return extractedSvg;
    }
    
    console.error('Diagram validation failed:', { 
        hasDrawingElements, 
        hasThemeColors, 
        hasValidSvg,
        svgContent: extractedSvg.substring(0, 200) + '...'
    });
    throw new Error(`Diagram validation failed: drawingElements=${hasDrawingElements}, themeColors=${hasThemeColors}, validSvg=${hasValidSvg}`);

  } catch (error) {
    console.error(`Diagram generation failed for description "${description}":`, error);
    
    // Create a more visual fallback diagram based on description keywords
    const createFallbackDiagram = (desc: string): string => {
      // Extract keywords for diagram elements
      const hasProcess = desc.toLowerCase().includes('süreç') || desc.toLowerCase().includes('adım') || desc.toLowerCase().includes('aşama');
      const hasHierarchy = desc.toLowerCase().includes('yapı') || desc.toLowerCase().includes('organizasyon') || desc.toLowerCase().includes('hiyerarşi');
      const hasFlow = desc.toLowerCase().includes('akış') || desc.toLowerCase().includes('yol') || desc.toLowerCase().includes('sıra');
      const hasComparison = desc.toLowerCase().includes('karşılaştır') || desc.toLowerCase().includes('fark') || desc.toLowerCase().includes('benzer');
      
      let elements = '';
      let title = 'Diyagram Şeması';
      
      if (hasProcess) {
        title = 'Süreç Diyagramı';
        elements = `
          <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0, 10 3, 0 6" fill="hsl(var(--foreground))"/></marker></defs>
          <rect x="70" y="120" width="80" height="60" fill="hsl(var(--primary))" rx="10"/>
          <text x="110" y="155" text-anchor="middle" fill="white" font-size="12">Başlangıç</text>
          <path d="M160 150 L190 150" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
          <rect x="200" y="120" width="80" height="60" fill="hsl(var(--secondary))" rx="10"/>
          <text x="240" y="155" text-anchor="middle" fill="white" font-size="12">İşlem</text>
          <path d="M290 150 L320 150" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
          <rect x="330" y="120" width="80" height="60" fill="hsl(var(--accent))" rx="10"/>
          <text x="370" y="155" text-anchor="middle" fill="white" font-size="12">Sonuç</text>
        `;
      } else if (hasHierarchy) {
        title = 'Yapı Diyagramı';
        elements = `
          <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0, 10 3, 0 6" fill="hsl(var(--foreground))"/></marker></defs>
          <rect x="200" y="50" width="100" height="50" fill="hsl(var(--primary))" rx="8"/>
          <text x="250" y="80" text-anchor="middle" fill="white" font-size="12">Ana Birim</text>
          <path d="M220 110 L170 140" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
          <path d="M280 110 L330 140" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
          <rect x="120" y="150" width="80" height="40" fill="hsl(var(--secondary))" rx="5"/>
          <text x="160" y="175" text-anchor="middle" fill="white" font-size="11">Alt Birim 1</text>
          <rect x="300" y="150" width="80" height="40" fill="hsl(var(--secondary))" rx="5"/>
          <text x="340" y="175" text-anchor="middle" fill="white" font-size="11">Alt Birim 2</text>
        `;
      } else if (hasFlow) {
        title = 'Akış Diyagramı';
        elements = `
          <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0, 10 3, 0 6" fill="hsl(var(--foreground))"/></marker></defs>
          <circle cx="100" cy="100" r="30" fill="hsl(var(--primary))"/>
          <text x="100" y="105" text-anchor="middle" fill="white" font-size="12">Başla</text>
          <path d="M130 100 L170 100" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
          <polygon points="200,80 240,100 200,120 160,100" fill="hsl(var(--secondary))"/>
          <text x="200" y="105" text-anchor="middle" fill="white" font-size="11">Karar?</text>
          <path d="M240 100 L280 100" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
          <text x="260" y="95" text-anchor="middle" fill="hsl(var(--foreground))" font-size="10">Evet</text>
          <circle cx="320" cy="100" r="30" fill="hsl(var(--constructive))"/>
          <text x="320" y="105" text-anchor="middle" fill="white" font-size="12">Bitir</text>
          <path d="M200 130 L200 170" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
          <text x="210" y="150" text-anchor="start" fill="hsl(var(--foreground))" font-size="10">Hayır</text>
          <rect x="160" y="180" width="80" height="40" fill="hsl(var(--destructive))" rx="5"/>
          <text x="200" y="205" text-anchor="middle" fill="white" font-size="11">Tekrar Et</text>
        `;
      } else if (hasComparison) {
        title = 'Karşılaştırma Diyagramı';
        elements = `
          <rect x="50" y="80" width="150" height="140" fill="hsl(var(--primary))" opacity="0.2" stroke="hsl(var(--primary))" stroke-width="2" rx="10"/>
          <text x="125" y="105" text-anchor="middle" fill="hsl(var(--primary))" font-size="14" font-weight="bold">Seçenek A</text>
          <circle cx="100" cy="140" r="15" fill="hsl(var(--primary))"/>
          <text x="100" y="145" text-anchor="middle" fill="white" font-size="10">✓</text>
          <circle cx="150" cy="140" r="15" fill="hsl(var(--primary))"/>
          <text x="150" y="145" text-anchor="middle" fill="white" font-size="10">✓</text>
          <circle cx="125" cy="180" r="15" fill="hsl(var(--muted-foreground))"/>
          <text x="125" y="185" text-anchor="middle" fill="white" font-size="10">✗</text>
          
          <rect x="300" y="80" width="150" height="140" fill="hsl(var(--secondary))" opacity="0.2" stroke="hsl(var(--secondary))" stroke-width="2" rx="10"/>
          <text x="375" y="105" text-anchor="middle" fill="hsl(var(--secondary))" font-size="14" font-weight="bold">Seçenek B</text>
          <circle cx="350" cy="140" r="15" fill="hsl(var(--secondary))"/>
          <text x="350" y="145" text-anchor="middle" fill="white" font-size="10">✓</text>
          <circle cx="400" cy="140" r="15" fill="hsl(var(--muted-foreground))"/>
          <text x="400" y="145" text-anchor="middle" fill="white" font-size="10">✗</text>
          <circle cx="375" cy="180" r="15" fill="hsl(var(--secondary))"/>
          <text x="375" y="185" text-anchor="middle" fill="white" font-size="10">✓</text>
        `;
      } else {
        // Generic diagram
        elements = `
          <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0, 10 3, 0 6" fill="hsl(var(--foreground))"/></marker></defs>
          <rect x="100" y="80" width="300" height="140" fill="hsl(var(--muted))" stroke="hsl(var(--border))" stroke-width="2" rx="15"/>
          <circle cx="180" cy="150" r="25" fill="hsl(var(--primary))"/>
          <text x="180" y="155" text-anchor="middle" fill="white" font-size="12">A</text>
          <circle cx="250" cy="120" r="20" fill="hsl(var(--secondary))"/>
          <text x="250" y="125" text-anchor="middle" fill="white" font-size="12">B</text>
          <circle cx="320" cy="150" r="25" fill="hsl(var(--accent))"/>
          <text x="320" y="155" text-anchor="middle" fill="white" font-size="12">C</text>
          <path d="M205 150 L225 135" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
          <path d="M270 125 L295 140" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
          <path d="M205 150 L295 150" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
        `;
      }
      
      return `<svg width="500" height="300" viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="hsl(var(--background))"/>
        ${elements}
        <text x="250" y="270" text-anchor="middle" fill="hsl(var(--muted-foreground))" font-size="12">${title}</text>
        <text x="250" y="30" text-anchor="middle" fill="hsl(var(--foreground))" font-size="14" font-weight="bold">Diyagram oluşturuluyor...</text>
      </svg>`;
    };
    
    return createFallbackDiagram(description);
  }
}
