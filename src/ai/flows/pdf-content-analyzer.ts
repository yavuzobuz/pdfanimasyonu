'use server';

/**
 * @fileOverview This flow analyzes PDF content to create a simplified summary and either a visual animation or a diagram.
 *
 * - analyzePdfGetScript - Generates a multi-scene animation script from PDF content.
 * - analyzePdfContentAsDiagram - Generates a single diagram from PDF content.
 * - analyzePdfSummaryAsDiagram - Generates diagram based on PDF summary analysis.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { generateSvg } from '@/ai/actions/generate-svg';
import { generateDiagram } from '@/ai/actions/generate-diagram';
import {
  AnalyzePdfContentInputSchema,
  PdfAnimationScriptSchema,
  type AnalyzePdfContentInput,
  type PdfAnimationScript,
  type AnalyzePdfContentDiagramOutput,
  PdfDiagramFromSummaryInputSchema,
  type PdfDiagramFromSummaryInput,
  PdfConceptsOutputSchema,
  type PdfConceptsOutput
} from '@/ai/schemas';
import {defineTool, generate} from '@genkit-ai/ai';


const pdfAnimationScriptPrompt = ai.definePrompt({
  name: 'pdfAnimationScriptPrompt',
  input: {schema: AnalyzePdfContentInputSchema},
  output: {schema: PdfAnimationScriptSchema},
  prompt: `Sen uzman bir eğitimcisin. PDF içeriğini derinlemesine analiz edip, herkesin anlayabileceği eğitimsel açıklamalar yapıyorsun. HTML animasyonlarındaki gibi aşamalı, detaylı ve yol gösterici yaklaşım kullanıyorsun.

GÖREV: PDF içeriğini analiz edip şunları oluştur:

1. **KAPSAMLI İÇERİK ÖZETİ:** (En az 5-6 paragraf)
   - PDF'in ana konusu ve amacı
   - Başlıca kavramlar ve tanımlar
   - İçeriğin pratik uygulamaları
   - Önemli prosedürler ve adımlar
   - Yasal/teknik gereklilikler ve kurallar
   - Dikkat edilmesi gereken kritik noktalar
   - Okuyucu için pratik öneriler ve ipuçları

2. **GÖRSEL SAHNE LİSTESİ:** (5-10 sahne, içeriğin karmaşıklığına göre)
   - PDF içeriğine dayalı somut sahneler
   - Gerçek kişiler, yerler, objeler tanımla
   - Türkçe açıklamalar kullan
   - İçerikten çıkarılan eğitimsel hikaye akışı
   - ⚠️ **SPESİFİK DETAYLAR ZORUNLU:** Sayılar, süreler, miktarlar, yüzdeler, tarihler belirtilmeli
   - SAHNE AÇIKLAMALARI: Somut bilgiler içeren başlıklar (max 20 kelime)
   - BASİT İÇERİK: 5-6 sahne (temel kavramlar, ana konular)
   - KARMAŞIK İÇERİK: 7-10 sahne (detaylı prosedürler, alt konular, özel durumlar)

**SPESİFİK DETAY ÖRNEKLERİ:**
❌ Yanlış: "Başvuru Süresi: Süre Sınırı"
✅ Doğru: "Başvuru: Son tarihi 30 gün içinde gerekli belgelerle"

❌ Yanlış: "Vergi Oranı: Hesaplama Yöntemi"  
✅ Doğru: "KDV Oranı: %18 standart oran, gıda ürünlerinde %8"

❌ Yanlış: "Ceza Miktarı: Para Cezası"
✅ Doğru: "Gecikme Cezası: Her gün için %0,05 faiz oranı"

**ÖZET YAKLAŞIMI:**
- PDF'deki her önemli bölümü kapsa
- Teorik bilgiyi pratik örneklerle destekle
- Adım adım süreçleri açıkla
- Okuyucuya yol gösterecek şekilde yaz
- "Bu nasıl uygulanır?", "Ne zaman gerekli?", "Nelere dikkat etmeli?" sorularına yanıt ver

**DETAYLI ÖZET ŞABLONU:**
📋 **Giriş Paragrafı:** PDF'in ne hakkında olduğu ve neden önemli olduğu
📖 **Kavramlar Paragrafı:** Ana terimlerin açıklaması ve tanımları
🔄 **Süreç Paragrafı:** Varsa adım adım prosedürler ve uygulamalar
⚖️ **Kurallar Paragrafı:** Yasal gereklilikler, standartlar ve zorunluluklar
⚠️ **Uyarılar Paragrafı:** Dikkat edilecek noktalar ve yaygın hatalar
💡 **Pratik Paragrafı:** Gerçek hayatta nasıl uygulanacağı ve ipuçları

**SAHNE ÖRNEĞİ:**
PDF: "İş sözleşmesi hukuku" için:
Sahne 1: "İşveren ve çalışan bir ofis masasında iş sözleşmesi imzalıyor"
Sahne 2: "Çalışan her ayın sonunda maaş bordrosu alıyor, hesap işlemleri yapılıyor"
Sahne 3: "İşçi sendika temsilcisiyle birlikte işveren ile toplantı yapıyor"

PDF Content: {{media url=pdfDataUri}}`,
});

// GÜNCELLENMİŞ PROMPT: PDF özet içeriğini analiz edip esnek sayıda kavram çıkarma - 5-15 KAVRAM
const pdfSummaryAnalysisPrompt = ai.definePrompt({
  name: 'pdfSummaryAnalysisPrompt',
  input: { schema: PdfDiagramFromSummaryInputSchema },
  output: { schema: PdfConceptsOutputSchema },
  prompt: `Sen uzman bir PDF kavram analisti ve eğitim uzmanısın. Verilen PDF özet metnini derinlemesine analiz edip içeriğin karmaşıklığına göre optimal sayıda anahtar kavram çıkarıyorsun.

PDF ÖZET METNİ: {{summary}}

GÖREV: PDF özet metnini analiz et ve içeriğin karmaşıklığına göre 5-15 arasında anahtar kavram çıkar. SEN KARAR VER kaç kavram gerekli!

🎯 KAVRAM SAYISI STRATEJİSİ:
- **BASİT İÇERİK (5-7 kavram):** Kısa belgeler, basit konular, temel prosedürler
- **ORTA İÇERİK (8-10 kavram):** Teknik belgeler, çok bölümlü içerik, detaylı süreçler  
- **KARMAŞIK İÇERİK (11-15 kavram):** Yasal belgeler, bilimsel makaleler, kapsamlı raporlar

💡 VURUCU TANIM KURALLARI:
- Her kavram için 4-8 kelimelik etkileyici tanım yaz
- Sıkıcı teknik dil YASAK!
- Uygulamalı açıklamalar kullan
- "Ne işe yarar?", "Nasıl kullanılır?" sorusuna yanıt veren tanımlar
- Akılda kalıcı, pratik ifadeler

✅ KALITE KONTROL:
- PDF özet metindeki GERÇEK kavramları kullan
- Her kavram içeriğin farklı bir bölümünü kapsamalı
- Önem sırasına göre sırala
- Tekrar eden kavramlar olmasın
- Her tanım özgün ve spesifik olmalı

ÇIKTI FORMATI:
İçerik karmaşıklığına göre 5-15 adet kavram objesi döndür:
- name: Kavram adı (2-3 kelime, PDF'den)
- description: Vurucu tanım (4-8 kelime, pratik dille)

ÖRNEK YAKLAŞIM:
Basit PDF "kira sözleşmesi" için 6 kavram:
[
  {"name": "Kira Bedeli", "description": "aylık ödeme miktarı ve zam oranı"},
  {"name": "Depozito", "description": "güvence amaçlı peşin ödenen tutar"},
  {"name": "Sözleşme Süresi", "description": "kiralama başlangıç ve bitiş tarihleri"},
  {"name": "Fesih Koşulları", "description": "sözleşmeyi sonlandırma kuralları ve süreçleri"},
  {"name": "Bakım Sorumlulukları", "description": "tamir ve onarım görev dağılımı"},
  {"name": "Teslim Prosedürü", "description": "daire teslim alma ve verme adımları"}
]

Karmaşık PDF "şirket birleşmesi" için 12 kavram:
[
  {"name": "Birleşme Türü", "description": "devralma veya yeni şirket kuruluşu"},
  {"name": "Değerleme Raporu", "description": "şirket varlıklarının mali değer tespiti"},
  {"name": "Hissedar Onayı", "description": "genel kurul kararı ve oy oranları"},
  {"name": "Yasal İzinler", "description": "rekabet kurulu ve bakanlık onayları"},
  ... (toplam 12 kavram)
]

🚀 ÖNEMLİ: PDF içeriğinin gerçek karmaşıklığını değerlendir ve buna göre kavram sayısına karar ver. Özet metindeki gerçek bilgileri kullan, hayali kavramlar oluşturma!`,
});

// Utility: extract keywords from PDF summary
function extractPdfKeywords(text: string, max = 8): string[] {
  if (!text) return [];
  const stopwords = new Set([
    've', 'veya', 'ile', 'bir', 'bu', 'için', 'gibi', 'olan', 'daha', 'çok', 'az', 'en', 'de', 'da', 'ki', 'mi', 'mu', 'mı', 'mü', 'birçok', 'ancak', 'pdf', 'belge', 'dosya'
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

const pdfDiagramDescriptionPrompt = ai.definePrompt({
  name: 'pdfDiagramDescriptionPrompt',
  input: {schema: AnalyzePdfContentInputSchema},
  output: {schema: z.string().nullable()},
  prompt: `Sen uzman bir eğitimci ve görsel tasarımcısın. PDF içeriğini analiz edip eğitici diyagramlar oluşturuyorsun.

GÖREV: PDF içeriğini DİKKATLE analiz edip, bu spesifik belgedeki gerçek kavramlara dayalı diyagram açıklaması oluştur.

🚫 ASLA NULL VEYA BOŞ DÖNDÜRME! 
- Her durumda geçerli bir diyagram açıklaması döndürmek ZORUNLU
- PDF analiz edilemezse bile genel eğitici diyagram oluştur
- Hiçbir durumda null, undefined veya boş string döndürme

❌ KESINLIKLE YASAK TEST VERİLERİ:
- "Örnek Şirket", "Test Kullanıcısı", "ABC Firması", "XYZ Ltd." gibi varsayımsal isimler
- "Kullanıcı A", "Kişi B", "X şirketi", "Y departmanı" gibi genel örnekler
- PDF'de geçmeyen kavramlar veya süreçler
- Varsayımsal senaryolar veya örnek durumlar
- Genel hukuki/teknik terimler yerine PDF'deki spesifik kavramlar

✅ ZORUNLU GERÇEK PDF VERİSİ KULLANIMI:
1. PDF'deki gerçek başlıkları, terimleri ve kavramları tespit et
2. Belgede geçen spesifik süreçleri, kuralları ve ilişkileri belirle
3. Bu GERÇEK içeriğe dayalı diyagram açıklaması yaz
4. Sadece PDF'deki spesifik bilgileri kullan, varsayım yapma

DIYAGRAM KURALLARI:
- PDF'de geçen GERÇEK kavram ve terimleri kullan
- Test verisi veya genel örnekler YASAK
- Belgede süreç varsa: adım adım akış diyagramı
- Belgede kavramlar varsa: merkezi ana konu etrafında mind map
- Belgede ilişkiler varsa: bağlantılı şema
- Türkçe etiketler kullan
- 3-5 ana element maksimum
- Basit şekiller (dikdörtgen, daire, ok) kullan

ÖRNEK YAKLAŞIM:
Eğer PDF "İş Sözleşmesi Feshi" hakkındaysa:
"Merkeze 'İş Sözleşmesi Feshi' yazan büyük mavi dikdörtgen çiz. Soldan 'Fesih Sebepleri' yeşil kutusu ekle. Sağdan 'Tazminat Hesaplama' sarı kutusu ekle. Alttan 'Yasal Süreç' turuncu kutusu ekle. Oklar ile bağla."

⚠️ PDF ANALİZ EDİLEMEZSE GENEL ŞABLON:
"Merkeze 'Belge İçeriği' yazan mavi dikdörtgen çiz. Soldan 'Ana Konular' yeşil kutusu ekle. Sağdan 'Önemli Noktalar' sarı kutusu ekle. Alttan 'Temel Bilgiler' turuncu kutusu ekle. Oklar ile bağla."

ZORUNLU ÇIKTI KURALLARI:
- MUTLAKA bir string döndür, asla boş veya null değer döndürme
- Diyagram açıklaması en az 20 kelime olmalı
- Başla: "Merkeze" ile
- Bitir: "Oklar ile bağla." ile

🔒 ZORUNLU: Her durumda geçerli diyagram açıklaması döndür. NULL YASAK! PDF'deki gerçek içeriği kullan, varsayımsal örnekler yapma!

PDF Content: {{media url=pdfDataUri}}`,
});

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

// GÜNCELLENMİŞ: Esnek sayıda kavram destekli PDF diyagram açıklama oluşturucu - 5-15 KAVRAM
function createOptimizedPdfDiagramDescription(concepts: Array<{name: string, description: string}>, theme: string): string {
  const conceptCount = concepts.length;
  
  // Metinleri kısalt
  const shortenText = (text: string, maxLength: number = 25) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };
  
  // Her kavram için başlık ve tanım ayrı ayrı hazırla - ALT ALT YAZILACAK
  const conceptBoxes = concepts.map(concept => ({
    title: shortenText(concept.name, 20),
    subtitle: shortenText(concept.description, 30)
  }));
  
  // Kavram sayısına göre renk paleti oluştur
  const generateColors = (count: number): string[] => {
    const baseColors = ['#22C55E', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16', '#FB923C', '#A855F7', '#10B981', '#EC4899', '#0EA5E9', '#F97316', '#14B8A6', '#6366F1'];
    return baseColors.slice(0, count);
  };
  
  // Kavram sayısına göre layout stratejisi belirle
  const getLayoutStrategy = (count: number) => {
    if (count <= 6) return 'circular_small'; // Dairesel, küçük grup
    if (count <= 8) return 'circular_large'; // Dairesel, büyük grup  
    if (count <= 10) return 'grid_3x3'; // 3x3 grid
    if (count <= 12) return 'double_circle'; // Çift daire
    return 'hierarchical'; // Hiyerarşik yapı
  };
  
  const colors = generateColors(conceptCount);
  const layout = getLayoutStrategy(conceptCount);
  
  switch (theme) {
    case 'Modern':
      return `Modern stil SVG diyagram: Merkeze 'PDF İçeriği' yazan 140x50 yuvarlatılmış köşeli (#4F46E5 gradyan) kutu çiz. 
      
      ${conceptCount} kavram ${layout} yerleşimi:
      ${conceptBoxes.map((concept, i) => 
        `${i + 1}. '${concept.title}' büyük başlık / '${concept.subtitle}' küçük açıklama yazan 115x50 (${colors[i]} gradyan) yuvarlatılmış kutu`
      ).join('\n      ')}
      
      Metinler kutu içinde ortalanmış ve sarılmış. Merkeze kalın yumuşak oklar ile bağla.`;
    
    case 'Minimalist':
      return `Minimalist stil SVG: Merkeze 'PDF İçeriği' yazan 140x50 ince çerçeveli (#6B7280) dikdörtgen. 
      
      ${conceptCount} kavram ${layout} düzenli yerleşimi:
      ${conceptBoxes.map((concept, i) => 
        `'${concept.title}' büyük / '${concept.subtitle}' küçük (#374151) 110x45`
      ).join(', ')}
      
      Metinler kutu sınırları içinde kalsın. İnce düz oklar ile merkeze bağla.`;
    
    case 'Renkli':
      return `Renkli stil SVG: Merkeze 'PDF İçeriği' yazan 140x50 parlak mavi (#3B82F6 gölgeli) dikdörtgen. 
      
      ${conceptCount} kavram ${layout} renkli yerleşim:
      ${conceptBoxes.map((concept, i) => 
        `${i + 1}. '${concept.title}' büyük başlık / '${concept.subtitle}' küçük açıklama yazan 115x50 parlak (${colors[i]} gölgeli) kutu`
      ).join('\n      ')}
      
      Metinler kutu içinde sarılmış. Kalın renkli oklar ve belirgin gölgeler.`;
    
    case 'Akış':
      return `Akış diyagramı SVG: Üstte 'PDF İçeriği' başlık. 
      
      ${conceptCount} adımlı akış sırası:
      ${conceptBoxes.map((concept, i) => {
        const shape = i === 0 ? 'başlangıç elipsi' : 
                    i === conceptCount - 1 ? 'sonuç elipsi' : 
                    i % 3 === 2 ? 'karar elması' : 'süreç dikdörtgeni';
        return `${i + 1}. '${concept.title}' büyük / '${concept.subtitle}' küçük yazan 115x50 ${shape} (${colors[i]})`;
      }).join('\n      ')}
      
      Dikey akış okları ile bağla. Metinler şekil sınırları içinde kalsın.`;
    
    case 'Ağ':
      return `Ağ şeması SVG: Merkeze 'PDF İçeriği' yazan 80x80 ana düğüm (#4F46E5 daire). 
      
      ${conceptCount} düğüm ${layout} yerleşimi:
      ${conceptBoxes.map((concept, i) => 
        `${i + 1}. '${concept.title}' üst / '${concept.subtitle}' alt yazan 60x60 (${colors[i]} daire)`
      ).join('\n      ')}
      
      Metinler daire içinde ortalanmış ve sarılmış. Çizgiler ile merkeze bağla. Komşu düğümler arası bağlantılar.`;
    
    case 'Süreç':
      return `Detaylı süreç akışı SVG: Üstte 'PDF İçeriği' yazan 160x40 başlık kutusu (#4F46E5). 
      
      ${conceptCount} aşamalı katmanlı süreç:
      ${conceptBoxes.map((concept, i) => {
        const shape = i % 4 === 0 ? 'yuvarlatılmış dikdörtgen' : 
                    i % 4 === 2 ? 'elmas' : 'dikdörtgen';
        return `${i + 1}. '${concept.title}' başlık / '${concept.subtitle}' detay yazan 125x50 ${shape} (${colors[i]})`;
      }).join('\n      ')}
      
      Metinler şekil sınırları içinde sarılmış. Dallanma okları ve karar noktaları.`;
    
    default: // Klasik
      return `Klasik SVG diyagram: Merkeze 'PDF İçeriği' yazan 140x50 mavi dikdörtgen. 
      
      ${conceptCount} kavram ${layout} yerleşimi:
      ${conceptBoxes.map((concept, i) => 
        `${i + 1}. '${concept.title}' kalın başlık / '${concept.subtitle}' ince açıklama yazan 115x50 kutu (${colors[i]})`
      ).join('\n      ')}
      
      Metinler kutu içinde ortalanmış ve sarılmış. Düz oklar ile merkeze bağla.`;
  }
}

// EXPORTED FUNCTIONS
export async function analyzePdfGetScript(input: AnalyzePdfContentInput): Promise<PdfAnimationScript> {
  try {
    const { output: script } = await pdfAnimationScriptPrompt(input);
    if (!script || !script.scenes || script.scenes.length === 0) {
      console.error("Failed to generate animation script from PDF.");
      return {
          summary: "PDF içeriğinden animasyon oluşturulamadı. Lütfen farklı bir dosya ile tekrar deneyin.",
          scenes: []
      };
    }
    return script;
  } catch (error) {
    console.error("Crashed in analyzePdfGetScript flow:", error);
    return {
        summary: "PDF analiz edilirken beklenmedik bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
        scenes: []
    };
  }
}

export async function analyzePdfContentAsDiagram(input: AnalyzePdfContentInput): Promise<AnalyzePdfContentDiagramOutput> {
  try {
    console.log("PDF diagram generation started for:", input.pdfDataUri?.substring(0, 50) + "...");
    
    const { output: diagramDescription } = await pdfDiagramDescriptionPrompt(input);
    console.log("Generated PDF diagram description:", diagramDescription);
    
    // Check if we got a valid description
    if (!diagramDescription || diagramDescription.trim() === "" || diagramDescription === "null") {
      throw new Error("Empty or null diagram description from PDF prompt");
    }
    
    const svgCode = await generateDiagram(diagramDescription);
    return { svg: svgCode };
    
  } catch (error) {
    console.error("Crashed in analyzePdfContentAsDiagram flow:", error);
    
    try {
      console.log("Using fallback - basic PDF diagram...");
      // Fallback: Generate basic diagram
      const basicDescription = "Merkeze 'PDF İçeriği' yazan mavi dikdörtgen çiz. Soldan 'Ana Konular' yeşil kutusu ekle. Sağdan 'Önemli Noktalar' sarı kutusu ekle. Alttan 'Sonuç' turuncu kutusu ekle. Oklar ile bağla.";
      const fallbackSvg = await generateDiagram(basicDescription);
      return { svg: fallbackSvg };
      
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError);
      
      // Final fallback: Empty diagram
      const emptySvg = `<svg width="400" height="300" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#f8f9fa" stroke="#e9ecef" stroke-width="2"/>
        <text x="200" y="150" text-anchor="middle" fill="#6c757d" font-family="Arial" font-size="16">
          Diyagram oluşturulamadı
        </text>
      </svg>`;
      return { svg: emptySvg };
    }
  }
}

// YENİ EXPORTED FUNCTION: PDF özet analizine dayalı diyagram oluşturma
export async function analyzePdfSummaryAsDiagram(input: PdfDiagramFromSummaryInput): Promise<AnalyzePdfContentDiagramOutput> {
  try {
    console.log("PDF özet analizi başlıyor:", { summaryLength: input.summary?.length });
    
    // PDF özet analizini çalıştır ve gerçek kavramları çıkar
    const { output: analysis } = await pdfSummaryAnalysisPrompt(input);
    console.log("PDF özet analizi sonucu:", analysis);
    
    if (!analysis || !analysis.concepts || analysis.concepts.length < 5 || analysis.concepts.length > 15) {
      throw new Error(`PDF özet analizi başarısız - ${analysis?.concepts?.length || 0} kavram çıkarıldı, 5-15 arası olmalı`);
    }
    
    // Analiz sonuçlarını kullanarak diyagram açıklaması oluştur
    const diagramDescription = createOptimizedPdfDiagramDescription(analysis.concepts, input.theme || 'Klasik');
    
    console.log("Oluşturulan PDF diyagram açıklaması:", diagramDescription);
    
    const svgCode = await generateDiagram(diagramDescription);
    return { svg: svgCode };
    
  } catch (error) {
    console.error("PDF özet analizi hatası:", error);
    
    try {
      console.log("PDF anahtar kelime fallback'ine geçiliyor...");
      // Fallback: Anahtar kelime çıkarımı kullan
      const keywords = extractPdfKeywords(input.summary || '', 8);
      const [k1 = 'Ana Konu', k2 = 'Önemli Bilgi', k3 = 'Süreç', k4 = 'Sonuç'] = keywords;
      
      const fallbackDescription = `Merkeze 'PDF İçeriği' yazan mavi dikdörtgen çiz. Soldan '${k1}: temel bilgi' yeşil kutusu ekle. Sağdan '${k2}: kritik nokta' sarı kutusu ekle. Üstten '${k3}: uygulama' mor kutusu ekle. Alttan '${k4}: çıktı' turuncu kutusu ekle. Oklar ile bağla.`;
      
      const svgCode = await generateDiagram(fallbackDescription);
      return { svg: svgCode };
      
    } catch (fallbackError) {
      console.error("PDF anahtar kelime fallback'i de başarısız:", fallbackError);
      
      // Son fallback: Sabit SVG
      const fallbackSvg = `<svg width="500" height="300" viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="hsl(var(--background))"/>
        <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0, 10 3, 0 6" fill="hsl(var(--foreground))"/></marker></defs>
        <rect x="175" y="125" width="150" height="50" fill="hsl(var(--primary))" rx="10"/>
        <text x="250" y="155" text-anchor="middle" fill="white" font-size="14">PDF İçeriği</text>
        <rect x="50" y="100" width="100" height="40" fill="hsl(var(--secondary))" rx="5"/>
        <text x="100" y="125" text-anchor="middle" fill="white" font-size="12">Ana Konu</text>
        <rect x="350" y="100" width="100" height="40" fill="hsl(var(--accent))" rx="5"/>
        <text x="400" y="125" text-anchor="middle" fill="white" font-size="12">Önemli Bilgi</text>
        <rect x="200" y="50" width="100" height="40" fill="hsl(var(--constructive))" rx="5"/>
        <text x="250" y="75" text-anchor="middle" fill="white" font-size="12">Süreç</text>
        <rect x="200" y="200" width="100" height="40" fill="hsl(var(--destructive))" rx="5"/>
        <text x="250" y="225" text-anchor="middle" fill="white" font-size="12">Sonuç</text>
        <path d="M150 120 L175 140" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
        <path d="M350 120 L325 140" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
        <path d="M250 100 L250 125" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
        <path d="M250 175 L250 200" stroke="hsl(var(--foreground))" stroke-width="2" marker-end="url(#arrow)"/>
        <text x="250" y="280" text-anchor="middle" fill="hsl(var(--muted-foreground))" font-size="12">PDF Özet Diyagramı</text>
      </svg>`;
      
      return { svg: fallbackSvg };
    }
  }
}

// YENİ EXPORTED FUNCTION: PDF tema destekli diyagram oluşturma
export async function analyzePdfSummaryAsThemedDiagram(input: PdfDiagramFromSummaryInput & { theme: string }): Promise<AnalyzePdfContentDiagramOutput> {
  try {
    console.log("PDF tema destekli özet analizi başlıyor:", { theme: input.theme, summaryLength: input.summary?.length });
    
    // PDF özet analizini çalıştır ve gerçek kavramları çıkar
    const { output: analysis } = await pdfSummaryAnalysisPrompt(input);
    console.log("PDF özet analizi sonucu:", analysis);
    
    if (!analysis || !analysis.concepts || analysis.concepts.length < 5 || analysis.concepts.length > 15) {
      throw new Error(`PDF tema destekli özet analizi başarısız - ${analysis?.concepts?.length || 0} kavram çıkarıldı, 5-15 arası olmalı`);
    }
    
    // Analiz sonuçlarını kullanarak temaya göre optimized diyagram açıklaması oluştur
    const diagramDescription = createOptimizedPdfDiagramDescription(analysis.concepts, input.theme || 'Klasik');
    
    console.log("Oluşturulan PDF tema diyagram açıklaması:", diagramDescription);
    
    const svgCode = await generateDiagram(diagramDescription);
    return { svg: svgCode };
    
  } catch (error) {
    console.error("PDF tema destekli özet analizi hatası:", error);
    
    try {
      console.log("PDF tema destekli anahtar kelime fallback'ine geçiliyor...");
      // Fallback: Anahtar kelime çıkarımı kullan - 8 KAVRAM
      const keywords = extractPdfKeywords(input.summary || '', 8);
      const [k1 = 'Ana Konu', k2 = 'Önemli Bilgi', k3 = 'Süreç', k4 = 'Sonuç', k5 = 'Yöntem', k6 = 'Araç', k7 = 'Kontrol', k8 = 'Değerlendirme'] = keywords;
      
      const fallbackConcepts = [
        { name: k1, description: 'temel bilgi' },
        { name: k2, description: 'kritik nokta' },
        { name: k3, description: 'uygulama süreci' },
        { name: k4, description: 'çıktı sonucu' },
        { name: k5, description: 'metodoloji' },
        { name: k6, description: 'kullanılan araç' },
        { name: k7, description: 'kontrol mekanizması' },
        { name: k8, description: 'sonuç değerlendirmesi' }
      ];
      
      const fallbackDescription = createOptimizedPdfDiagramDescription(fallbackConcepts, input.theme);
      
      const svgCode = await generateDiagram(fallbackDescription);
      return { svg: svgCode };
      
    } catch (fallbackError) {
      console.error("PDF tema destekli anahtar kelime fallback'i de başarısız:", fallbackError);
      
      // Son fallback: Temaya göre sabit SVG
      const getThemedPdfFallbackSvg = (theme: string) => {
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
        
        return `<svg width="500" height="300" viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="hsl(var(--background))"/>
          <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0, 10 3, 0 6" fill="${colors.primary}"/></marker></defs>
          <rect x="175" y="125" width="150" height="50" fill="${colors.primary}" rx="${theme === 'Modern' ? '15' : theme === 'Minimalist' ? '2' : '10'}"/>
          <text x="250" y="155" text-anchor="middle" fill="white" font-size="14">PDF İçeriği</text>
          <rect x="50" y="100" width="100" height="40" fill="${colors.secondary}" rx="${theme === 'Modern' ? '12' : theme === 'Minimalist' ? '2' : '5'}"/>
          <text x="100" y="125" text-anchor="middle" fill="white" font-size="12">Ana Konu</text>
          <rect x="350" y="100" width="100" height="40" fill="${colors.accent}" rx="${theme === 'Modern' ? '12' : theme === 'Minimalist' ? '2' : '5'}"/>
          <text x="400" y="125" text-anchor="middle" fill="white" font-size="12">Önemli Bilgi</text>
          <rect x="200" y="50" width="100" height="40" fill="${colors.highlight}" rx="${theme === 'Modern' ? '12' : theme === 'Minimalist' ? '2' : '5'}"/>
          <text x="250" y="75" text-anchor="middle" fill="white" font-size="12">Süreç</text>
          <rect x="200" y="200" width="100" height="40" fill="${colors.primary}" rx="${theme === 'Modern' ? '12' : theme === 'Minimalist' ? '2' : '5'}"/>
          <text x="250" y="225" text-anchor="middle" fill="white" font-size="12">Sonuç</text>
          <path d="M150 120 L175 140" stroke="${colors.primary}" stroke-width="${theme === 'Minimalist' ? '1' : '2'}" marker-end="url(#arrow)"/>
          <path d="M350 120 L325 140" stroke="${colors.primary}" stroke-width="${theme === 'Minimalist' ? '1' : '2'}" marker-end="url(#arrow)"/>
          <path d="M250 100 L250 125" stroke="${colors.primary}" stroke-width="${theme === 'Minimalist' ? '1' : '2'}" marker-end="url(#arrow)"/>
          <path d="M250 175 L250 200" stroke="${colors.primary}" stroke-width="${theme === 'Minimalist' ? '1' : '2'}" marker-end="url(#arrow)"/>
          <text x="250" y="280" text-anchor="middle" fill="hsl(var(--muted-foreground))" font-size="12">${theme} PDF Diyagramı</text>
        </svg>`;
      };
      
      const fallbackSvg = getThemedPdfFallbackSvg(input.theme);
      return { svg: fallbackSvg };
    }
  }
}
