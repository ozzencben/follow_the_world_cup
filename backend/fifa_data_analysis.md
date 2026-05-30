# 📋 FIFA Dünya Kupası 2026 Veri Seti Analizi (Röntgen Raporu)

Bu doküman, resmi FIFA API'sinden (`cxm-api.fifa.com`) elde edilen **FIFA Dünya Kupası 2026** takımları veri setinin kapsamlı analizini ve yapısal dökümünü içermektedir.

---

## 🔍 1. Veri Setine Genel Bakış ve Üst Düzey Metadatalar

Veri seti, turnuvaya katılmaya hak kazanan **48 ülkenin** tamamının resmi yapılandırma ve demografik verilerini içerir (Kanada, Meksika ve ABD ev sahipliğindeki 2026 turnuvası için).

### Kök Seviyedeki Temel Özellikler
| Anahtar | Tür | Değer / Örnek | Açıklama |
| :--- | :--- | :--- | :--- |
| `entryId` | `string` | `"4v5Yng3VdGD9c1cpnOIff1"` | FIFA içerik sistemindeki Takımlar Modülü bölümünün benzersiz kimliği. |
| `seasonId` | `string` | `"285023"` | Dünya Kupası 2026 sezonunun benzersiz kimliği. |
| `tournamentState` | `string` | `"Upcoming"` | Turnuvanın mevcut durumu (Gelecek/Yaklaşan). |
| `teamsTotal` | `number` | `48` | Katılımcı milli takım sayısı (İlk kez 48 takıma genişletilen format). |
| `teams` | `array` | `[...]` | 48 milli takımın detaylı profil nesnelerini içeren dizi. |

---

## 🛠️ 2. Detaylı Nesne Şeması (Milli Takım Nesnesi)

`teams` dizisindeki her bir eleman oldukça yapısal bir şema ile biçimlendirilmiştir. Tek bir takım nesnesinin anatomik yapısı şu şekildedir:

```json
{
    "teamId": "43899",
    "teamName": "Canada",
    "teamFlag": "https://api.fifa.com/api/v3/picture/flags-{format}-{size}/CAN",
    "teamPageUrl": "/en/tournaments/mens/worldcup/canadamexicousa2026/teams/canada",
    "confederationId": "CONCACAF",
    "stage": "Group B",
    "worldRanking": 30,
    "appearances": 2,
    "teamStageType": 0,
    "hostTeam": true,
    "teamEnrichmentData": {
        "teamId": "43899",
        "primaryColor": "#D52B1E",
        "secondaryColor": "#FFFFFF",
        "primaryTextColor": "#FFFFFF",
        "secondaryTextColor": "#000000",
        "teamEmblem": "",
        "confederationLogoType": ""
    }
}
```

### Parametrelerin Detaylı Açıklamaları

1. **`teamId`** *(string)*: Ülkenin FIFA sistemindeki benzersiz milli takım kimliği.
2. **`teamName`** *(string)*: Ülkenin ekran adı.
3. **`teamFlag`** *(string/şablon)*: Dinamik bir bayrak görseli URL şablonu.
   - 💡 **Teknik İpucu:** Arayüzünüzde `{format}` ve `{size}` yer tutucularını dinamik olarak değiştirmeniz gerekir.
   - Sık kullanılan formatlar: `sq` (Kare), `rect` (Dikdörtgen).
   - Sık kullanılan boyutlar: `sq-2`, `sq-3`, `rect-2`, `rect-3` vb.
   - Çözümlenmiş örnek URL: `https://api.fifa.com/api/v3/picture/flags-sq-3/CAN`
4. **`confederationId`** *(string)*: Ülkenin bağlı olduğu kıtasal futbol konfederasyonu:
   - `UEFA` (Avrupa)
   - `CONMEBOL` (Güney Amerika)
   - `CONCACAF` (Kuzey, Orta Amerika ve Karayipler)
   - `CAF` (Afrika)
   - `AFC` (Asya)
   - `OFC` (Okyanusya)
5. **`stage`** *(string)*: Takımın yer aldığı Dünya Kupası grubu. 48 takımlı yeni genişletilmiş formatta **Group A**'dan **Group L**'ye kadar **12 grup** bulunmaktadır.
6. **`worldRanking`** *(number)*: Takımın mevcut resmi FIFA Erkekler Dünya Sıralaması.
7. **`appearances`** *(number)*: Ülkenin geçmişteki Dünya Kupası finallerine toplam katılım sayısı (2026 hariç).
8. **`hostTeam`** *(boolean)*: Turnuvanın ev sahiplerini belirler (Kanada, Meksika ve ABD için `true`).
9. **`teamEnrichmentData`** *(nesne)*: Marka varlıkları ve kurumsal renk kodları.
   - **`primaryColor` / `secondaryColor`**: Milli takımın resmi marka/forma renkleri (HEX formatında).
   - **`primaryTextColor` / `secondaryTextColor`**: WCAG standartlarına uygun, arka plan renkleriyle yüksek kontrast oluşturan yazı renkleri.

---

## 🎨 3. Arayüz Tasarımı ve Dinamik Tema Gücü (Enrichment Data)

Bu veri setinin en değerli yönlerinden biri, `teamEnrichmentData` içinde gömülü olan marka renk sistemidir. Bu sistem, **tamamen dinamik ve takım renkleriyle eşleşen premium arayüzler** oluşturmanıza olanak tanır.

### Görsel Örnek: Veri Setindeki Marka Renk Paletleri

Aşağıda, bu HEX kodlarının doğrudan CSS özel değişkenlerinde (CSS Custom Properties) nasıl kullanılabileceğine dair örnekler yer almaktadır:

```css
/* JSON verilerine göre dinamik olarak oluşturulan CSS Değişkenleri */
.team-card-can {
  --primary-color: #D52B1E;
  --secondary-color: #FFFFFF;
  --text-color: #FFFFFF;
}

.team-card-bra {
  --primary-color: #FFCF25;
  --secondary-color: #004DE1;
  --text-color: #000000;
}
```

Bu yapı sayesinde, her takımın sayfasının, maç kartlarının veya istatistik grafiklerinin resmi milli renkleriyle uyum sağladığı **harika bir Dünya Kupası kullanıcı deneyimi** tasarlamak son derece kolaylaşır!

---

## 📊 4. Grup Dağılımları (4 Takımlı 12 Grup)

Verilerin analizi, 48 takımın **12 Gruba (A'dan L'ye)** kusursuz bir şekilde bölündüğünü göstermektedir. Dosyadaki resmi grup kurası dağılımları şu şekildedir:

*   **A Grubu**: Meksika, Çekya, Güney Kore, Güney Afrika
*   **B Grubu**: Kanada, Bosna-Hersek, Katar, İsviçre
*   **C Grubu**: Brezilya, Haiti, Fas, İskoçya
*   **D Grubu**: ABD, Avustralya, Paraguay, Türkiye
*   **E Grubu**: Fildişi Sahili, Curaçao, Ekvador, Almanya
*   **F Grubu**: Japonya, Hollanda, İsveç, Tunus
*   **G Grubu**: Belçika, Mısır, İran, Yeni Zelanda
*   **H Grubu**: Yeşil Burun Adaları (Cabo Verde), Suudi Arabistan, İspanya, Uruguay
*   **I Grubu**: Fransa, Irak, Norveç, Senegal
*   **J Grubu**: Cezayir, Arjantin, Avusturya, Ürdün
*   **K Grubu**: Kolombiya, Demokratik Kongo Cumhuriyeti, Portekiz, Özbekistan
*   **L Grubu**: Hırvatistan, İngiltere, Gana, Panama

---

## 💡 5. Potansiyel Kullanım Senaryoları ve Arayüz Uygulamaları

Bir **"Dünya Kupası Takip Dashboard'u"** geliştiriyorsanız, bu JSON dosyası aşağıdaki özellikleri beslemek için mükemmel bir **temel veritabanı** görevi görür:

### 1️⃣ Grup Aşamasına Genel Bakış Paneli
- **Görsel Tasarım**: Grupları (A-L) temsil eden 12 karttan oluşan şık bir ızgara (grid) yapısı.
- **Özellikler**: Her gruptaki 4 takım yan yana listelenir; her takım kendi `primaryColor` renginde bir çerçeve veya rozetle vurgulanır, yanında bayrağı ve FIFA sıralaması yer alır.

### 2️⃣ Dinamik Temalı Milli Takım Sayfaları
- **Görsel Tasarım**: Kullanıcı bir takıma tıkladığında, tüm arayüz teması (arka plan gradyanları, butonların hover durumları, yazı renkleri) anında o takımın `primaryColor` ve `secondaryColor` renklerine bürünür.
- **Özellikler**: Şu bilgileri içeren gelişmiş istatistik kartları:
  - **Katılım Sayısı**: Yıldız (`⭐`) ikonlarıyla görselleştirilmiş geçmiş katılımlar.
  - **Konfederasyon Rozeti**: Kıtalara göre renklendirilmiş özel rozetler.
  - **FIFA Sıralaması**: Turnuvadaki en güçlü takıma kıyasla nerede olduğunu gösteren şık bir gösterge veya karşılaştırma grafiği.

### 3️⃣ Tarihsel "Güç ve Deneyim" Grafiği
- **Görsel Tasarım**: D3 veya Chart.js kullanılarak oluşturulan, **FIFA Dünya Sıralaması** (Y Ekseni) ile **Tarihsel Katılım Sayısı**'nı (X Ekseni) karşılaştıran bir saçılım (scatter) veya balon grafiği.
- **Özellikler**: Balonların boyutları takımın ev sahibi olup olmamasına (`hostTeam`) göre değişebilir, renkler ise konfederasyona göre dinamik atanabilir.

### 4️⃣ Ev Sahibi Takımlara Özel Vurgu
- **Görsel Tasarım**: 3 ev sahibi ülkeye (Kanada, Meksika, ABD) özel, cam efekti (glassmorphism) ve milli renkleriyle animasyonlu parıltı efektleri içeren özel bir "Ev Sahipleri" vitrini.

---

## 🛠️ 6. Teknik Uygulama Planı (Kod Taslağı)

Verileri modern bir frontend veya backend uygulamasında modellemek için aşağıdaki örnek şemayı kullanabilirsiniz (TypeScript örneği):

```typescript
export interface TeamEnrichmentData {
  teamId: string;
  primaryColor: string;
  secondaryColor: string;
  primaryTextColor: string;
  secondaryTextColor: string;
  teamEmblem: string;
  confederationLogoType: string;
}

export interface Team {
  teamId: string;
  teamName: string;
  teamFlag: string; // Dinamik Bayrak URL şablonu
  teamPageUrl: string;
  confederationId: 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC';
  stage: string; // Grup adı (Örn: 'Group A')
  worldRanking: number;
  appearances: number;
  teamStageType: number;
  hostTeam: boolean;
  teamEnrichmentData: TeamEnrichmentData;
}

export interface FifaDataRoot {
  entryId: string;
  title: string;
  seasonId: string;
  viewType: string;
  tournamentState: string;
  automatedSection: boolean;
  teams: Team[];
  teamsTotal: number;
}
```

### Bayrak URL'lerini Çözen Yardımcı Fonksiyon
```javascript
export function getTeamFlagUrl(templateUrl, format = 'rect', size = '3') {
  return templateUrl
    .replace('{format}', format)
    .replace('{size}', size);
}
```
