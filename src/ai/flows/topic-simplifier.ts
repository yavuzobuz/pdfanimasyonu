'use server';
/**
 * @fileOverview A topic simplification AI agent that can generate animations or diagrams.
 *
 * - simplifyTopicGetScript - Generates a summary and scene descriptions for a topic.
 * - simplifyTopicAsDiagram - Generates a single diagram for a topic.
 * - simplifyTopicSummaryAsDiagram - Generates diagram based on summary content.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { generateSvg, generateDiagram } from '@/ai/actions/generate-svg';
import { 
    SimplifyTopicInputSchema, 
    TopicAnimationScriptSchema, 
    TopicDiagramFromSummaryInputSchema,
    type SimplifyTopicInput,
    type TopicAnimationScript,
    type SimplifyTopicDiagramOutput,
    type TopicDiagramFromSummaryInput
} from '@/ai/schemas';
import {defineTool, generate} from '@genkit-ai/ai';

const topicAnimationScriptPrompt = ai.definePrompt({
  name: 'topicAnimationScriptPrompt',
  input: {schema: SimplifyTopicInputSchema},
  output: {schema: TopicAnimationScriptSchema},
  prompt: `Sen uzman bir eğitimcisin. Karmaşık konuları herkesin anlayabileceği şekilde basitleştiriyorsun ve eğitici animasyonlar oluşturuyorsun.

GÖREV: Konuyu derinlemesine analiz edip şunları oluştur:

1. **KAPSAMLI EĞİTİCİ ÖZET:** (En az 7-8 paragraf, her biri 4-5 cümle)
   - 📌 **Tanım ve Önem:** Konunun ne olduğu, neden kritik öneme sahip olduğu
   - 🔍 **Detaylı Kavramlar:** Ana terimlerin derinlemesine açıklaması ve aralarındaki ilişkiler
   - 🏠 **Gerçek Hayat Örnekleri:** Somut, günlük hayattan anlaşılır örnekler
   - ⚖️ **Yasal/Teknik Çerçeve:** Kurallar, standartlar, yasal gereklilikler (varsa)
   - 🔧 **Adım Adım Süreç:** Nasıl uygulanır, hangi aşamalar takip edilir
   - ⚠️ **CAN ALICI NOKTALAR:** Dikkat edilmesi gereken kritik uyarılar ve yaygın hatalar
   - 💡 **Pratik Öneriler:** Uzman ipuçları, en iyi uygulamalar
   - 📚 **İleri Öğrenme:** Konuyu derinleştirmek için öneriler

2. **GÖRSEL SAHNE LİSTESİ:** (4-5 sahne)
   - Her sahne konunun farklı bir yönünü eğitici şekilde göstermeli
   - Kısa eğitici başlıklar (10-15 kelime max)
   - Konunun temel kavramlarını somut objelerle açıklayacak

**DETAYLI ÖZET YAKLAŞIMI:**
- Her paragraf farklı bir boyutu ele alsın
- Teorik bilgiyi mutlaka pratik örneklerle destekle
- "Neden önemli?", "Nasıl uygulanır?", "Nelere dikkat etmeli?" sorularını yanıtla
- Okuyucuya rehberlik et, sadece bilgi verme
- Can alıcı noktaları mutlaka vurgula (⚠️ işareti ile)
- Gerçek hayat senaryoları ver

**ÖRNEK ÖZET YAKLASIMI:**
🎯 **İlk Paragraf:** Konunun tanımı ve neden önemli olduğu
📚 **İkinci Paragraf:** Ana kavramların detaylı açıklaması 
🏠 **Üçüncü Paragraf:** Günlük hayattaki somut örnekler
⚖️ **Dördüncü Paragraf:** Yasal/teknik gereklilikler (varsa)
🔧 **Beşinci Paragraf:** Adım adım uygulanabilir rehber (Adım 1, Adım 2, ...)
⚠️ **Altıncı Paragraf:** CAN ALICI NOKTALAR - Dikkat edilecek kritik uyarılar
💡 **Yedinci Paragraf:** Uzman ipuçları ve en iyi uygulamalar
📚 **Son Paragraf:** İleri öğrenme önerileri ve meta-öğrenme ipuçları

**SAHNE KURALLARI:**
- Her sahne konunun temel kavramlarını göstermeli
- Gerçek hayattaki prosedürleri yansıtmalı  
- Eğitici değer taşımalı, sadece hikaye anlatmamalı
- SAHNE AÇIKLAMALARI: Kısa eğitici başlıklar olmalı (max 10-15 kelime)
- ÖNCELİK: Konunun en önemli kavramlarını seç (haklar, koşullar, hesaplamalar, yasal gereklilikler)
- Prosedür değil KAVRAM odaklı sahneler oluştur

Topic: {{topic}}
`,
});

// YENİ PROMPT: Özet içeriğini analiz edip diyagram kavramları çıkarma - ARTIK 8 KAVRAM
const summaryAnalysisPrompt = ai.definePrompt({
  name: 'summaryAnalysisPrompt',
  input: { schema: TopicDiagramFromSummaryInputSchema },
  output: { schema: z.object({
    concepts: z.array(z.object({
      name: z.string(),
      description: z.string()
    })).length(8)
  }) },
  prompt: `Sen özet analiz uzmanısın. Verilen özet metnini analiz edip en önemli 8 kavramı çıkarıyorsun.

KONU: {{topic}}
ÖZET METNİ: {{summary}}

GÖREV: Özet metnini analiz et ve konunun en önemli 8 kavramını çıkar.

KURALLAR:
- Özet metindeki gerçek kavramları kullan
- Her kavram için kısa açıklama yaz (3-5 kelime)
- Konunun farklı yönlerini kapsasın
- Önem sırasına göre sırala
- Hem temel kavramları hem detayları içersin
- Tarihsel/kronolojik sıra varsa onu takip et

ÇIKTI FORMATI:
8 adet kavram objesi döndür:
- name: Kavram adı (2-3 kelime)
- description: Kısa açıklama (3-5 kelime)

ÖRNEK:
Konu "vergi beyannamesi" için:
[
  {"name": "Gelir Beyanı", "description": "maaş ve kira gelirleri"},
  {"name": "İndirim Kalemleri", "description": "eğitim ve sağlık giderleri"},
  {"name": "Gerekli Belgeler", "description": "makbuz ve fatura toplama"},
  {"name": "Ödeme Süreci", "description": "son tarih ve faiz hesabı"},
  {"name": "E-Beyanname", "description": "online sistem kullanımı"},
  {"name": "Vergi Dairesi", "description": "başvuru ve kontrol merkezi"},
  {"name": "Ceza ve Faiz", "description": "gecikme durumu sonuçları"},
  {"name": "İade Süreci", "description": "fazla ödeme geri alma"}
]

ÖNEMLİ: Özet metindeki gerçek bilgileri kullan, hayali kavramlar oluşturma. 8 kavram konunun tüm yönlerini kapsamalı.`,
});

// Utility: extract up to 8 keywords from summary for fallback diagram description
function extractKeywords(text: string, max = 8): string[] {
  if (!text) return [];
  // Basit anahtar kelime çıkarımı: 3+ harfli kelimeleri al, say ve en sık geçenleri döndür
  const stopwords = new Set([
    've', 'veya', 'ile', 'bir', 'bu', 'için', 'gibi', 'olan', 'daha', 'çok', 'çok', 'az', 'en', 'ile', 'de', 'da', 'ki', 'mi', 'mu', 'mı', 'mü', 'birçok', 'ancak'
  ]);
  const freq: Record<string, number> = {};
  text.toLowerCase().replace(/[^a-zğüşöçıİA-ZĞÜŞÖÇ\s]/g, ' ').split(/\s+/).forEach(word => {
    if (word.length < 4) return;
    if (stopwords.has(word)) return;
    freq[word] = (freq[word] || 0) + 1;
  });
  const keywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
  return keywords;
}

// Text wrapping yardımcı fonksiyonu
function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    
    // Yaklaşık karakter sayısına göre satır uzunluğunu kontrol et
    if (testLine.length <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Tek kelime çok uzunsa, zorla böl
        lines.push(word);
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

// SVG text elementi oluşturma yardımcı fonksiyonu
function createSVGTextElement(text: string, x: number, y: number, maxWidth: number, options: {
  fontSize?: number;
  fill?: string;
  textAnchor?: 'start' | 'middle' | 'end';
  fontWeight?: string;
} = {}): string {
  const {
    fontSize = 12,
    fill = 'white',
    textAnchor = 'middle',
    fontWeight = 'normal'
  } = options;
  
  // Metin uzunluğuna göre maksimum karakter sayısını hesapla
  const maxChars = Math.floor(maxWidth / (fontSize * 0.6)); // Yaklaşık karakter genişliği
  const lines = wrapText(text, maxChars);
  
  let svgText = '';
  const lineHeight = fontSize + 2;
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  
  lines.forEach((line, index) => {
    const lineY = startY + (index * lineHeight);
    svgText += `<text x="${x}" y="${lineY}" text-anchor="${textAnchor}" fill="${fill}" font-size="${fontSize}" font-weight="${fontWeight}">${line}</text>\n`;
  });
  
  return svgText;
}

// Optimized diagram description creator - 8 KAVRAM DESTEĞİ
function createOptimizedDiagramDescription(topic: string, concepts: Array<{name: string, description: string}>, theme: string): string {
  const [c1, c2, c3, c4, c5, c6, c7, c8] = concepts;
  
  // Metinleri kısalt
  const shortenText = (text: string, maxLength: number = 25) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };
  
  const shortTopic = shortenText(topic, 20);
  const shortC1 = shortenText(`${c1.name}: ${c1.description}`, 30);
  const shortC2 = shortenText(`${c2.name}: ${c2.description}`, 30);
  const shortC3 = shortenText(`${c3.name}: ${c3.description}`, 30);
  const shortC4 = shortenText(`${c4.name}: ${c4.description}`, 30);
  const shortC5 = shortenText(`${c5.name}: ${c5.description}`, 30);
  const shortC6 = shortenText(`${c6.name}: ${c6.description}`, 30);
  const shortC7 = shortenText(`${c7.name}: ${c7.description}`, 30);
  const shortC8 = shortenText(`${c8.name}: ${c8.description}`, 30);
  
  switch (theme) {
    case 'Modern':
      return `Modern stil kapsamlı SVG diyagram: Üst merkeze '${shortTopic}' yazan 180x60 yuvarlatılmış köşeli (#4F46E5 gradyan) ana başlık kutusu çiz. 
      
      İkinci seviye: Ana başlığın altında 4 ana kategori kutusu yerleştir:
      - Sol üst: 'Temel Kavramlar' (#10B981 gradyan) 130x40 kutu
      - Sağ üst: 'Metodoloji' (#F59E0B gradyan) 130x40 kutu  
      - Sol alt: 'Uygulama' (#8B5CF6 gradyan) 130x40 kutu
      - Sağ alt: 'Sonuçlar' (#EF4444 gradyan) 130x40 kutu
      
      Üçüncü seviye detaylar (her kategoride 2 alt kavram):
      'Temel Kavramlar' altında:
      - '${shortC1}' (#22C55E) 115x30 alt kutu
      - '${shortC2}' (#16A34A) 115x30 alt kutu
      
      'Metodoloji' altında:
      - '${shortC3}' (#FB923C) 115x30 alt kutu
      - '${shortC4}' (#EA580C) 115x30 alt kutu
      
      'Uygulama' altında:
      - '${shortC5}' (#A855F7) 115x30 alt kutu
      - '${shortC6}' (#9333EA) 115x30 alt kutu
      
      'Sonuçlar' altında:
      - '${shortC7}' (#DC2626) 115x30 alt kutu
      - '${shortC8}' (#B91C1C) 115x30 alt kutu
      
      Bağlantılar: Ana başlıktan 4 ana kategoriye kalın oklar. Her ana kategoriden alt kutulara ince oklar. Kategoriler arası çapraz bağlantılar. Gradyan renkler ve yumuşak gölgeler kullan.`;
      
    case 'Minimalist':
      return `Minimalist hiyerarşik SVG: Üstte '${shortTopic}' yazan 160x50 ince çerçeveli (#6B7280) ana kutu.
      
      Hiyerarşik yapı:
      Level 1: '${shortTopic}' ana başlık
      Level 2: 4 ana dal
      - 'Kavramsal Temel' (#374151) 120x35
      - 'Metodoloji' (#374151) 120x35
      - 'Uygulama Alanı' (#374151) 120x35  
      - 'Sonuçlar' (#374151) 120x35
      
      Level 3: Her daldan 2 alt kavram
      Kavramsal Temel → '${shortC1}' (#6B7280) 105x25, '${shortC2}' (#6B7280) 105x25
      Metodoloji → '${shortC3}' (#6B7280) 105x25, '${shortC4}' (#6B7280) 105x25
      Uygulama Alanı → '${shortC5}' (#6B7280) 105x25, '${shortC6}' (#6B7280) 105x25
      Sonuçlar → '${shortC7}' (#6B7280) 105x25, '${shortC8}' (#6B7280) 105x25
      
      Sade ince çizgiler ile bağlantılar. Minimal renkler, temiz layout.`;
      
    case 'Renkli':
      return `Renkli kapsamlı SVG şema: Merkeze '${shortTopic}' yazan 200x70 parlak mavi (#3B82F6 gölgeli) ana merkez.
      
      Radyal yapı: Merkez etrafında 8 ana bölüm (dairesel yerleşim)
      1. 'Tanım ve Kapsam' (#22C55E gölgeli) 130x45 - içinde '${shortC1}' alt kutu
      2. 'Temel Prensipler' (#FB923C gölgeli) 130x45 - içinde '${shortC2}' alt kutu
      3. 'Metodoloji' (#A855F7 gölgeli) 130x45 - içinde '${shortC3}' alt kutu
      4. 'Uygulama Alanları' (#EF4444 gölgeli) 130x45 - içinde '${shortC4}' alt kutu
      5. 'Pratik Örnekler' (#06B6D4 gölgeli) 130x45 - içinde '${shortC5}' alt kutu
      6. 'Sonuç ve Etkiler' (#84CC16 gölgeli) 130x45 - içinde '${shortC6}' alt kutu
      7. 'Değerlendirme' (#F59E0B gölgeli) 130x45 - içinde '${shortC7}' alt kutu
      8. 'Gelecek Perspektif' (#8B5CF6 gölgeli) 130x45 - içinde '${shortC8}' alt kutu
      
      Her bölümden merkeze kalın renkli oklar. Komşu bölümler arası çapraz bağlantılar. Parlak renkler ve belirgin gölgeler.`;
      
    case 'Akış':
      return `Akış diyagramı: ${shortTopic} süreci. Başlangıç dairesel şekil → '${shortC1}' dikdörtgen → '${shortC2}' dikdörtgen → Karar elması: '${shortC3}' → Evet yolu: '${shortC4}' son şekli. Hayır yolu: '${shortC5}' tekrar döngüsü. İkincil dal: '${shortC6}' → '${shortC7}' → '${shortC8}' son noktası. Renkli kutular ve akış okları.`;
      
    case 'Ağ':
      return `Ağ şeması: Merkeze '${shortTopic}' daire. Etrafında 8 kavram dairesi: '${shortC1}', '${shortC2}', '${shortC3}', '${shortC4}', '${shortC5}', '${shortC6}', '${shortC7}', '${shortC8}'. Merkezden her kavrama bağlantı çizgisi. Kavramlar arası çapraz bağlantılar. Renkli daireler ve ağ yapısı.`;
      
    case 'Süreç':
      return `Süreç diyagramı: ${shortTopic} adımları. Üstte başlık kutusu → '${shortC1}' süreç → '${shortC2}' süreç → '${shortC3}' süreç → '${shortC4}' süreç. Alt seviyede: '${shortC5}' → '${shortC6}' → '${shortC7}' → '${shortC8}'. Paralel süreçler ve birleştirme noktası. Renkli kutu ve bağlantı okları.`;
      
    default: // Klasik
      return `Kapsamlı klasik SVG diyagram: Üst merkeze '${shortTopic}' yazan 180x55 mavi ana başlık.
      
      Hiyerarşik yapı:
      Level 1: Ana başlık
      Level 2: 4 ana kategori
      - 'Temel Kavramlar' (#22C55E) 140x40 → içinde '${shortC1}' alt kutu
      - 'Metodoloji' (#F59E0B) 140x40 → içinde '${shortC2}' alt kutu
      - 'Uygulama' (#8B5CF6) 140x40 → içinde '${shortC3}' alt kutu
      - 'Sonuçlar' (#EF4444) 140x40 → içinde '${shortC4}' alt kutu
      
      Level 3: Her kategoriden 2 alt kavram
      Temel Kavramlar → '${shortC5}' (#16A34A) 110x30, '${shortC6}' (#15803D) 110x30
      Metodoloji → 'Yöntemler' (#EA580C) 110x30, 'Araçlar' (#C2410C) 110x30
      Uygulama → '${shortC7}' (#7C3AED) 110x30, '${shortC8}' (#6D28D9) 110x30
      Sonuçlar → 'Çıktılar' (#DC2626) 110x30, 'Değerlendirme' (#B91C1C) 110x30
      
      Bağlantılar: Ana başlıktan kategorilere kalın oklar, kategorilerden alt kavramlara orta oklar, kategoriler arası ilişki okları.`;
  }
}

// EXPORTED FUNCTIONS
export async function simplifyTopicGetScript(input: SimplifyTopicInput): Promise<TopicAnimationScript> {
  try {
    const { output: script } = await topicAnimationScriptPrompt(input);
    if (!script || !script.scenes || script.scenes.length === 0) {
      console.error("Failed to generate animation script for topic.");
      return {
          summary: "Konu özeti oluşturulamadı. Lütfen farklı bir konuyla tekrar deneyin.",
          scenes: []
      };
    }
    return script;
  } catch(error) {
    console.error("Crashed in simplifyTopicGetScript flow:", error);
    return {
        summary: "Konu basitleştirilirken beklenmedik bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
        scenes: []
    };
  }
}

export async function simplifyTopicAsDiagram(input: SimplifyTopicInput): Promise<SimplifyTopicDiagramOutput> {
  try {
    // Basit diyagram açıklaması oluştur
    const simpleDiagramDescription = `Merkeze '${input.topic}' yazan mavi dikdörtgen çiz. Soldan 'Temel Kavram: ana bilgi' yeşil kutusu ekle. Sağdan 'Önemli Nokta: kritik bilgi' sarı kutusu ekle. Üstten 'Uygulama: pratik bilgi' mor kutusu ekle. Alttan 'Sonuç: çıktı bilgi' turuncu kutusu ekle. Oklar ile bağla.`;
    
    const svgCode = await generateDiagram(simpleDiagramDescription);
    return { svg: svgCode };
  } catch(error) {
    console.error("Diyagram oluşturma hatası:", error);
    
    // Fallback diyagram
    const fallbackSvg = `<svg width="500" height="300" viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="hsl(var(--background))"/>
      <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0, 10 3, 0 6" fill="hsl(var(--foreground))"/></marker></defs>
      <rect x="175" y="125" width="150" height="50" fill="hsl(var(--primary))" rx="10"/>
      <text x="250" y="155" text-anchor="middle" fill="white" font-size="14">${input.topic}</text>
      <rect x="50" y="100" width="100" height="40" fill="hsl(var(--secondary))" rx="5"/>
      <text x="100" y="125" text-anchor="middle" fill="white" font-size="12">Temel Kavram</text>
      <rect x="350" y="100" width="100" height="40" fill="hsl(var(--accent))" rx="5"/>
      <text x="400" y="125" text-anchor="middle" fill="white" font-size="12">Önemli Nokta</text>
      <rect x="200" y="50" width="100" height="40" fill="hsl(var(--constructive))" rx="5"/>
      <text x="250" y="75" text-anchor="middle" fill="white" font-size="12">Uygulama</text>
      <rect x="200" y="200" width="100" height="40" fill="hsl(var(--destructive))" rx="5"/>
      <text x="250" y="225" text-anchor="middle" fill="white" font-size="12">Sonuç</text>
      <path d="M150 120 L175 140" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
      <path d="M350 120 L325 140" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
      <path d="M250 100 L250 125" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
      <path d="M250 175 L250 200" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
      <text x="250" y="280" text-anchor="middle" fill="hsl(var(--muted-foreground))" font-size="12">Diyagram Şeması</text>
    </svg>`;
    
    return { svg: fallbackSvg };
  }
}

// EXPORTED FUNCTION: generate diagram based on summary analysis
export async function simplifyTopicSummaryAsDiagram(input: TopicDiagramFromSummaryInput): Promise<SimplifyTopicDiagramOutput> {
  try {
    console.log("Özet analizi başlıyor:", { topic: input.topic, summaryLength: input.summary?.length });
    
    // Özet analizini çalıştır ve gerçek kavramları çıkar
    const { output: analysis } = await summaryAnalysisPrompt(input);
    console.log("Özet analizi sonucu:", analysis);
    
    if (!analysis || !analysis.concepts || analysis.concepts.length !== 8) {
      throw new Error("Özet analizi başarısız - geçerli kavramlar çıkarılamadı");
    }
    
    // Analiz sonuçlarını kullanarak diyagram açıklaması oluştur
    const diagramDescription = createOptimizedDiagramDescription(input.topic || 'Konu', analysis.concepts, input.theme || 'Klasik');
    
    console.log("Oluşturulan diyagram açıklaması:", diagramDescription);
    
    const svgCode = await generateDiagram(diagramDescription);
    return { svg: svgCode };
    
  } catch (error) {
    console.error("Özet analizi hatası:", error);
    
    try {
      console.log("Anahtar kelime fallback'ine geçiliyor...");
      // Fallback: Anahtar kelime çıkarımı kullan
      const keywords = extractKeywords(input.summary || '', 8);
      const [k1 = 'Temel Kavram', k2 = 'Önemli Nokta', k3 = 'Uygulama', k4 = 'Sonuç', k5 = 'E-Beyanname', k6 = 'Vergi Dairesi', k7 = 'Ceza ve Faiz', k8 = 'İade Süreci'] = keywords;
      
      const fallbackConcepts = [
        { name: k1, description: 'ana bilgi' },
        { name: k2, description: 'kritik nokta' },
        { name: k3, description: 'pratik bilgi' },
        { name: k4, description: 'çıktı bilgi' },
        { name: k5, description: 'online sistem kullanımı' },
        { name: k6, description: 'başvuru ve kontrol merkezi' },
        { name: k7, description: 'gecikme durumu sonuçları' },
        { name: k8, description: 'fazla ödeme geri alma' }
      ];
      
      const fallbackDescription = createOptimizedDiagramDescription(input.topic || 'Konu', fallbackConcepts, input.theme || 'Klasik');
      
      const svgCode = await generateDiagram(fallbackDescription);
      return { svg: svgCode };
      
    } catch (fallbackError) {
      console.error("Anahtar kelime fallback'i de başarısız:", fallbackError);
      
      // Son fallback: Temaya göre sabit SVG
      const getThemedFallbackSvg = (theme: string, topic: string) => {
        const baseColors = {
          'Modern': { primary: '#4F46E5', secondary: '#10B981', accent: '#F59E0B', highlight: '#8B5CF6' },
          'Minimalist': { primary: '#6B7280', secondary: '#374151', accent: '#6B7280', highlight: '#374151' },
          'Renkli': { primary: '#3B82F6', secondary: '#22C55E', accent: '#FB923C', highlight: '#A855F7' },
          'Akış': { primary: '#22C55E', secondary: '#3B82F6', accent: '#FB923C', highlight: '#EF4444' },
          'Ağ': { primary: '#4F46E5', secondary: '#22C55E', accent: '#FB923C', highlight: '#A855F7' },
          'Süreç': { primary: '#22C55E', secondary: '#3B82F6', accent: '#FB923C', highlight: '#EF4444' },
          'Klasik': { primary: 'hsl(var(--primary))', secondary: 'hsl(var(--secondary))', accent: 'hsl(var(--accent))', highlight: 'hsl(var(--constructive))' }
        };
        
        const colors = baseColors[theme as keyof typeof baseColors] || baseColors.Klasik;
        
        // Kısa metinler için fallback SVG
        const shortenedTopic = topic.length > 15 ? topic.substring(0, 12) + '...' : topic;
        
        return `<svg width="500" height="300" viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="hsl(var(--background))"/>
          <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0, 10 3, 0 6" fill="${colors.primary}"/></marker></defs>
          <rect x="175" y="125" width="150" height="50" fill="${colors.primary}" rx="${theme === 'Modern' ? '15' : theme === 'Minimalist' ? '2' : '10'}"/>
          <text x="250" y="155" text-anchor="middle" fill="white" font-size="14">${shortenedTopic}</text>
          <rect x="50" y="100" width="100" height="40" fill="${colors.secondary}" rx="${theme === 'Modern' ? '12' : theme === 'Minimalist' ? '2' : '5'}"/>
          <text x="100" y="125" text-anchor="middle" fill="white" font-size="11">Ana Kavram</text>
          <rect x="350" y="100" width="100" height="40" fill="${colors.accent}" rx="${theme === 'Modern' ? '12' : theme === 'Minimalist' ? '2' : '5'}"/>
          <text x="400" y="125" text-anchor="middle" fill="white" font-size="11">Önemli Bilgi</text>
          <rect x="200" y="50" width="100" height="40" fill="${colors.highlight}" rx="${theme === 'Modern' ? '12' : theme === 'Minimalist' ? '2' : '5'}"/>
          <text x="250" y="75" text-anchor="middle" fill="white" font-size="11">Uygulama</text>
          <rect x="200" y="200" width="100" height="40" fill="${colors.primary}" rx="${theme === 'Modern' ? '12' : theme === 'Minimalist' ? '2' : '5'}"/>
          <text x="250" y="225" text-anchor="middle" fill="white" font-size="11">Sonuç</text>
          <path d="M150 120 L175 140" stroke="${colors.primary}" stroke-width="${theme === 'Minimalist' ? '1' : '2'}" marker-end="url(#arrow)"/>
          <path d="M350 120 L325 140" stroke="${colors.primary}" stroke-width="${theme === 'Minimalist' ? '1' : '2'}" marker-end="url(#arrow)"/>
          <path d="M250 100 L250 125" stroke="${colors.primary}" stroke-width="${theme === 'Minimalist' ? '1' : '2'}" marker-end="url(#arrow)"/>
          <path d="M250 175 L250 200" stroke="${colors.primary}" stroke-width="${theme === 'Minimalist' ? '1' : '2'}" marker-end="url(#arrow)"/>
          <text x="250" y="280" text-anchor="middle" fill="hsl(var(--muted-foreground))" font-size="12">${theme} Diyagram</text>
        </svg>`;
      };
      
      const fallbackSvg = getThemedFallbackSvg(input.theme || 'Klasik', input.topic || 'Konu');
      return { svg: fallbackSvg };
    }
  }
}

// YENİ EXPORTED FUNCTION: Tema destekli diyagram oluşturma
export async function simplifyTopicSummaryAsThemedDiagram(input: TopicDiagramFromSummaryInput & { theme: string }): Promise<SimplifyTopicDiagramOutput> {
  try {
    console.log("Tema destekli özet analizi başlıyor:", { topic: input.topic, theme: input.theme, summaryLength: input.summary?.length });
    
    // Özet analizini çalıştır ve gerçek kavramları çıkar
    const { output: analysis } = await summaryAnalysisPrompt(input);
    console.log("Özet analizi sonucu:", analysis);
    
    if (!analysis || !analysis.concepts || analysis.concepts.length !== 8) {
      throw new Error("Özet analizi başarısız - geçerli kavramlar çıkarılamadı");
    }
    
    // Analiz sonuçlarını kullanarak temaya göre optimized diyagram açıklaması oluştur
    const diagramDescription = createOptimizedDiagramDescription(input.topic, analysis.concepts, input.theme);
    
    console.log("Oluşturulan tema diyagram açıklaması:", diagramDescription);
    
    const svgCode = await generateDiagram(diagramDescription);
    return { svg: svgCode };
    
  } catch (error) {
    console.error("Tema destekli özet analizi hatası:", error);
    
    try {
      console.log("Tema destekli anahtar kelime fallback'ine geçiliyor...");
      // Fallback: Anahtar kelime çıkarımı kullan
      const keywords = extractKeywords(input.summary || '', 8);
      const [k1 = 'Temel Kavram', k2 = 'Önemli Nokta', k3 = 'Uygulama', k4 = 'Sonuç', k5 = 'E-Beyanname', k6 = 'Vergi Dairesi', k7 = 'Ceza ve Faiz', k8 = 'İade Süreci'] = keywords;
      
      const fallbackConcepts = [
        { name: k1, description: 'ana bilgi' },
        { name: k2, description: 'kritik nokta' },
        { name: k3, description: 'pratik bilgi' },
        { name: k4, description: 'çıktı bilgi' },
        { name: k5, description: 'online sistem kullanımı' },
        { name: k6, description: 'başvuru ve kontrol merkezi' },
        { name: k7, description: 'gecikme durumu sonuçları' },
        { name: k8, description: 'fazla ödeme geri alma' }
      ];
      
      const fallbackDescription = createOptimizedDiagramDescription(input.topic || 'Konu', fallbackConcepts, input.theme || 'Klasik');
      
      const svgCode = await generateDiagram(fallbackDescription);
      return { svg: svgCode };
      
    } catch (fallbackError) {
      console.error("Tema destekli anahtar kelime fallback'i de başarısız:", fallbackError);
      
      // Son fallback: Temaya göre sabit SVG
      const getThemedFallbackSvg = (theme: string, topic: string) => {
        const baseColors = {
          'Modern': { primary: '#4F46E5', secondary: '#10B981', accent: '#F59E0B', highlight: '#8B5CF6' },
          'Minimalist': { primary: '#6B7280', secondary: '#374151', accent: '#6B7280', highlight: '#374151' },
          'Renkli': { primary: '#3B82F6', secondary: '#22C55E', accent: '#FB923C', highlight: '#A855F7' },
          'Akış': { primary: '#22C55E', secondary: '#3B82F6', accent: '#FB923C', highlight: '#EF4444' },
          'Ağ': { primary: '#4F46E5', secondary: '#22C55E', accent: '#FB923C', highlight: '#A855F7' },
          'Süreç': { primary: '#22C55E', secondary: '#3B82F6', accent: '#FB923C', highlight: '#EF4444' },
          'Klasik': { primary: 'hsl(var(--primary))', secondary: 'hsl(var(--secondary))', accent: 'hsl(var(--accent))', highlight: 'hsl(var(--constructive))' }
        };
        
        const colors = baseColors[theme as keyof typeof baseColors] || baseColors.Klasik;
        
        // Kısa metinler için fallback SVG
        const shortenedTopic = topic.length > 15 ? topic.substring(0, 12) + '...' : topic;
        
        return `<svg width="500" height="300" viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="hsl(var(--background))"/>
          <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0, 10 3, 0 6" fill="${colors.primary}"/></marker></defs>
          <rect x="175" y="125" width="150" height="50" fill="${colors.primary}" rx="${theme === 'Modern' ? '15' : theme === 'Minimalist' ? '2' : '10'}"/>
          <text x="250" y="155" text-anchor="middle" fill="white" font-size="14">${shortenedTopic}</text>
          <rect x="50" y="100" width="100" height="40" fill="${colors.secondary}" rx="${theme === 'Modern' ? '12' : theme === 'Minimalist' ? '2' : '5'}"/>
          <text x="100" y="125" text-anchor="middle" fill="white" font-size="11">Ana Kavram</text>
          <rect x="350" y="100" width="100" height="40" fill="${colors.accent}" rx="${theme === 'Modern' ? '12' : theme === 'Minimalist' ? '2' : '5'}"/>
          <text x="400" y="125" text-anchor="middle" fill="white" font-size="11">Önemli Bilgi</text>
          <rect x="200" y="50" width="100" height="40" fill="${colors.highlight}" rx="${theme === 'Modern' ? '12' : theme === 'Minimalist' ? '2' : '5'}"/>
          <text x="250" y="75" text-anchor="middle" fill="white" font-size="11">Uygulama</text>
          <rect x="200" y="200" width="100" height="40" fill="${colors.primary}" rx="${theme === 'Modern' ? '12' : theme === 'Minimalist' ? '2' : '5'}"/>
          <text x="250" y="225" text-anchor="middle" fill="white" font-size="11">Sonuç</text>
          <path d="M150 120 L175 140" stroke="${colors.primary}" stroke-width="${theme === 'Minimalist' ? '1' : '2'}" marker-end="url(#arrow)"/>
          <path d="M350 120 L325 140" stroke="${colors.primary}" stroke-width="${theme === 'Minimalist' ? '1' : '2'}" marker-end="url(#arrow)"/>
          <path d="M250 100 L250 125" stroke="${colors.primary}" stroke-width="${theme === 'Minimalist' ? '1' : '2'}" marker-end="url(#arrow)"/>
          <path d="M250 175 L250 200" stroke="${colors.primary}" stroke-width="${theme === 'Minimalist' ? '1' : '2'}" marker-end="url(#arrow)"/>
          <text x="250" y="280" text-anchor="middle" fill="hsl(var(--muted-foreground))" font-size="12">${theme} Diyagram</text>
        </svg>`;
      };
      
      const fallbackSvg = getThemedFallbackSvg(input.theme || 'Klasik', input.topic || 'Konu');
      return { svg: fallbackSvg };
    }
  }
}
