# 📋 FIFA Dünya Kupası 2026 Fikstür ve Aşamalar Analizi (Rounds Röntgen Raporu)

Bu doküman, FIFA'nın resmi Bracket Predictor (Braket Tahmincisi) API'sinden (`play.fifa.com`) elde edilen **FIFA Dünya Kupası 2026** fikstür ve aşamalar veri setinin (`rounds.json`) kapsamlı analizini ve yapısal dökümünü içermektedir.

Turnuva boyunca tüm maçların tarihlerini, oynanacakları stadyumları, eşleşmeleri ve skor bilgilerini barındıran bu veri seti, uygulamamız için harika bir **dinamik takvim ve tahmin motoru** oluşturma imkanı sunmaktadır.

---

## 🔍 1. Veri Setine Genel Bakış ve Yapısal Röntgen

`rounds.json` dosyası, turnuvanın grup aşamasından başlayarak büyük finale kadar uzanan tüm süreci **8 ana aşama (Round)** altında yapılandırır. 48 takımın katılacağı bu dev turnuvada grup aşaması maçları, her takımın oynayacağı 3 grup maçına denk gelecek şekilde **3 ayrı tura (Round ID: 1, 2, 3)** bölünmüştür.

### Temel İstatistikler
*   **Toplam Aşama Sayısı (Rounds):** 8
*   **Grup Aşaması Aşamaları:** 3 Tur (Round 1, Round 2, Round 3)
*   **Toplam Grup Maçı Sayısı:** 72 Maç (12 Grup x 6 Maç)
*   **Benzersiz Stadyum Sayısı:** 16 Stadyum (ABD, Kanada ve Meksika genelinde)
*   **Turnuvadaki Takım Sayısı:** 48 Milli Takım
*   **Eleme Aşamaları (Knockout Stages):** 5 Aşama (Son 32, Son 16, Çeyrek Final, Yarı Final, Final)

---

## 🛠️ 2. Detaylı Nesne Şeması (Rounds & Tournaments)

JSON dosyası, kök seviyesinde bir dizi (Array) içerir. Bu dizideki her bir eleman bir **Aşama (Round)** nesnesidir.

### A. Aşama (Round) Nesnesi Şeması

| Parametre | Tür | Örnek Değer | Açıklama |
| :--- | :--- | :--- | :--- |
| `id` | `number` | `1` | Aşamanın benzersiz sıralı kimliği (1'den 8'e kadar). |
| `stage` | `string` | `"GROUP"` | Turnuva aşamasının kategorisi (`GROUP`, `R32`, `R16`, `QF`, `SF`, `F`). |
| `status` | `string` | `"scheduled"` | Aşamanın genel durumu. |
| `startDate` | `string` | `"2026-06-11T00:00:00+01:00"` | Aşamanın başlangıç tarihi ve saati (ISO-8601). |
| `endDate` | `string` | `"2026-06-17T23:59:59+01:00"` | Aşamanın bitiş tarihi ve saati (ISO-8601). |
| `tournaments` | `array` | `[...]` | O aşamada oynanacak maç nesnelerini içeren dizi. |

---

### B. Maç (Tournament) Nesnesi Şeması

`tournaments` dizisi altındaki her bir maç nesnesi, o karşılaşmanın tüm detaylarını, konumunu ve (oynandıkça güncellenecek olan) skorlarını tutar:

```json
{
    "id": 2,
    "venueName": "Mexico City Stadium",
    "date": "2026-06-11T20:00:00+01:00",
    "homeSquadId": 8,
    "awaySquadId": 23,
    "homeSquadName": "Mexico",
    "awaySquadName": "South Africa",
    "winner": null,
    "homeScore": null,
    "awayScore": null,
    "homePenaltyScore": null,
    "awayPenaltyScore": null,
    "status": "scheduled",
    "bracketId": 0
}
```

#### Maç Parametrelerinin Röntgeni ve Detayları:
1.  **`id`** *(number)*: FIFA sistemindeki benzersiz maç kimliği.
2.  **`venueName`** *(string)*: Karşılaşmanın oynanacağı stadyumun adı (Örn: `Mexico City Stadium`).
3.  **`date`** *(string)*: Maçın başlama zamanı (ISO-8601 formatında ve zaman dilimi sapmasıyla, örn: `+01:00`).
4.  **`homeSquadId` / `awaySquadId`** *(number)*: İç saha ve dış saha takımlarının sistemdeki kimlik numaraları (Örn: Meksika için `8`).
5.  **`homeSquadName` / `awaySquadName`** *(string)*: Karşılaşacak ülkelerin ekran adları.
6.  **`winner`** *(null / number)*: Maçın kazanan takımının ID'si. Turnuva başlamadığı için şu an hepsi `null`'dır.
7.  **`homeScore` / `awayScore`** *(null / number)*: Maçın normal süresi (ve varsa uzatmalar) sonundaki gol sayıları. Şu an hepsi `null`'dır.
8.  **`homePenaltyScore` / `awayPenaltyScore`** *(null / number)*: Eleme turlarında penaltılara giden maçlarda atılan penaltı golleri. Grup aşamasında ve henüz oynanmamış maçlarda `null`'dır.
9.  **`status`** *(string)*: Maçın oynanma durumu (Örn: `"scheduled"`, oynanırken `"live"`, bittiğinde `"finished"` vb.).
10. **`bracketId`** *(number)*: Eleme aşamalarındaki braket dalının kimliği (Grup aşamasında `0`'dır).

---

## 📅 3. Turnuva Aşamaları ve Kronolojik Zaman Tüneli

Veri setindeki 8 aşamanın tarih aralıkları ve maç sayıları analiz edildiğinde aşağıdaki turnuva takvimi ortaya çıkmaktadır:

| Aşama ID | Aşama Kodu | Turnuva Aşaması | Başlangıç Tarihi | Bitiş Tarihi | Maç Sayısı | Açıklama |
| :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| **1** | `GROUP` | Grup Aşaması - 1. Maçlar | 11 Haziran 2026 | 17 Haziran 2026 | **22** | Gruplardaki ilk karşılaşmalar. Turnuvanın açılışı (Meksika vs Güney Afrika). |
| **2** | `GROUP` | Grup Aşaması - 2. Maçlar | 18 Haziran 2026 | 23 Haziran 2026 | **24** | Gruplardaki ikinci kritik karşılaşmalar. |
| **3** | `GROUP` | Grup Aşaması - 3. Maçlar | 24 Haziran 2026 | 27 Haziran 2026 | **26** | Grupların kaderini belirleyecek son maçlar (Aynı anda oynanırlar). |
| **4** | `R32` | Son 32 Turu (Round of 32) | 28 Haziran 2026 | 03 Temmuz 2026 | **0\*** | 32 takımın tek maçlı eleme usulü karşılaştığı ilk tur. |
| **5** | `R16` | Son 16 Turu (Round of 16) | 04 Temmuz 2026 | 07 Temmuz 2026 | **0\*** | Çeyrek finale kalma mücadeleleri. |
| **6** | `QF` | Çeyrek Finaller (Quarter-Finals) | 09 Temmuz 2026 | 11 Temmuz 2026 | **0\*** | Yarı finale kalacak en iyi 4 takımın belirlenmesi. |
| **7** | `SF` | Yarı Finaller (Semi-Finals) | 14 Temmuz 2026 | 15 Temmuz 2026 | **0\*** | Dev finalin kapısını aralayacak iki büyük maç. |
| **8** | `F` | Büyük Final ve 3.lük Maçı | 19 Temmuz 2026 | 19 Temmuz 2026 | **0\*** | Dünyanın en büyüğünün belli olacağı gün! |

> [!NOTE]
> **\* Eleme Aşamalarında Boş Maçlar:** `R32`, `R16`, `QF`, `SF` ve `F` aşamalarında şu an `tournaments` dizisi boştur. Çünkü grup aşaması bitmeden hangi takımların bu turlara yükseleceği ve hangi stadyumlarda eşleşeceği kesinleşmemiştir. Turnuva başladığında veya kullanıcı tahmin yaptıkça bu alanlar dinamik olarak doldurulacaktır.

---

## 🏟️ 4. Stadyumlar ve Maç Dağılımları

Grup aşamasındaki **72 maçın** stadyumlara göre dağılımı turnuvanın coğrafi yayılımını net bir şekilde göstermektedir:

*   **5 Maç Oynanacak Stadyumlar (10 Stadyum - En Yoğunlar):**
    *   *San Francisco Bay Area Stadium*
    *   *Boston Stadium*
    *   *New York/New Jersey Stadium*
    *   *Los Angeles Stadium*
    *   *Houston Stadium*
    *   *Philadelphia Stadium*
    *   *Dallas Stadium*
    *   *Atlanta Stadium*
    *   *Toronto Stadium* (Kanada)
    *   *BC Place Vancouver* (Kanada)
*   **4 Maç Oynanacak Stadyumlar (4 Stadyum):**
    *   *Seattle Stadium*
    *   *Miami Stadium*
    *   *Kansas City Stadium*
    *   *Guadalajara Stadium* (Meksika)
*   **3 Maç Oynanacak Stadyumlar (2 Stadyum):**
    *   *Mexico City Stadium* (Meksika)
    *   *Monterrey Stadium* (Meksika)

💡 **Teknik Çıkarım:** ABD stadyumları ve Kanada stadyumları (Toronto & Vancouver) grup aşamasında 5'er maça ev sahipliği yaparken, Meksika stadyumları (Mexico City, Monterrey, Guadalajara) turnuvanın başında daha az sayıda (3-4) maça sahne olacaktır.

---

## 💡 5. Projemiz İçin Sunduğu Muazzam Fırsatlar (Kullanım Senaryoları)

Bu veri seti, projemizin değerini katlayacak ve kullanıcıyı **WOW** dedirtecek premium özelliklerin temelini oluşturur:

### 1️⃣ İnteraktif Turnuva Fikstürü ve Takvim Sayfası (Match Calendar)
*   **Görsel Tasarım:** Gün gün veya turlara (Round 1, 2, 3) göre ayrılmış, kart tasarımlı şık bir zaman tüneli.
*   **Filtreleme Gücü:**
    *   **Takıma Göre Filtre:** Kullanıcı Türkiye'yi seçtiğinde, Türkiye'nin oynayacağı 3 grup maçını (tarih, saat ve stadyum detaylarıyla) anında listeler.
    *   **Stadyuma Göre Filtre:** Belirli bir stadyumda oynanacak tüm maçları görebilme.
    *   **Tarihe Göre Filtre:** O gün oynanacak tüm maçları listeleyen bir "Bugünün Maçları" widget'ı.

### 2️⃣ Dinamik Puan Durumu Hesaplayıcı (Live Standings Engine)
*   Şu ana kadar yazdığımız `Groups.tsx` sayfasındaki puan tabloları statik veya takımların sadece listesinden ibaret.
*   **Sihirli Geliştirme:** Arka planda `rounds.json` dosyasını tarayan bir fonksiyon yazabiliriz. Eğer maçlarda `homeScore` ve `awayScore` değerleri `null` değilse (yani maç oynanmışsa), sistem otomatik olarak:
    *   Kazanana +3 puan, beraberliğe +1 puan yazar.
    *   Atılan gol, yenilen gol, averaj ve galibiyet/beraberlik/yenilgi sayılarını hesaplar.
    *   Grup tablolarını (A-L arası 12 tabloyu) **gerçek zamanlı ve hatasız** olarak sıralar!
    *   Bu sayede turnuva başladığında sadece bu JSON'ı güncellememiz tüm sitenin puan durumunu ayağa kaldırması için yeterli olur!

### 3️⃣ İnteraktif Braket / Skor Tahmin Oyunu (World Cup Predictor)
*   Madem bu veri FIFA'nın kendi tahmin oyunundan geliyor, biz de projemize premium bir **"Skor Tahmin Sayfası"** ekleyebiliriz!
*   **Nasıl Çalışır?**
    1.  Kullanıcı grup aşamasındaki maçların skor tahminlerini kutucuklara girer.
    2.  Girdiğimiz tahminlere göre puan durumu motorumuz (Standings Engine) anında çalışır ve gruplarda 1., 2. ve en iyi 3.leri belirler.
    3.  Belirlenen bu takımlar **otomatik olarak** Son 32 (R32) aşamasına yerleştirilir!
    4.  Kullanıcı eleme turlarındaki maçları da tahmin ederek kendi Dünya Kupası şampiyonunu belirler.
    5.  Oluşan braket (bracket) şeması görsel olarak muhteşem bir ağaç grafiğiyle kullanıcıya sunulur.

---

## 🛠️ 6. Teknik Uygulama Modelleri (TypeScript & Python)

Bu verileri projemizde kusursuz yönetmek için kullanacağımız veri modelleri ve yardımcı servis kod taslakları:

### TypeScript (Frontend - `src/types/fixtures.ts`)

```typescript
export interface Match {
  id: number;
  venueName: string;
  date: string; // ISO-8601
  homeSquadId: number;
  awaySquadId: number;
  homeSquadName: string;
  awaySquadName: string;
  winner: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  status: 'scheduled' | 'live' | 'finished';
  bracketId: number;
}

export interface Round {
  id: number;
  stage: 'GROUP' | 'R32' | 'R16' | 'QF' | 'SF' | 'F';
  status: string;
  startDate: string;
  endDate: string;
  tournaments: Match[];
}
```

### Python (Backend Yardımcı Fonksiyonu - Puan Durumu Hesaplama Taslağı)

```python
def calculate_group_standings(rounds_data, teams_data):
    # Her grup için puan durumu tablosu başlat
    # A-L grupları için boş istatistik nesneleri oluşturulur
    standings = {}
    
    for round_item in rounds_data:
        if round_item["stage"] != "GROUP":
            continue
            
        for match in round_item["tournaments"]:
            home = match["homeSquadName"]
            away = match["awaySquadName"]
            hs = match["homeScore"]
            as_ = match["awayScore"]
            
            # Eğer skorlar girilmişse (maç oynanmışsa) hesaplama yap
            if hs is not None and as_ is not None:
                # Galibiyet, mağlubiyet, averaj ve puan ekleme mantığı...
                pass
                
    return standings
```

---

## 🎯 Sonuç ve Değerlendirme

`rounds.json` dosyası, Dünya Kupası 2026 projemizin **kalbi ve omurgasıdır**. `fifa_data.json` ile birleştiğinde (yani takımların kurumsal renkleri, logoları ve bayraklarıyla), **eşsiz bir görsel şölen ve kusursuz bir turnuva takip sistemi** kurmamıza olanak sağlar.

Bir sonraki adımda, bu verileri frontend tarafına taşıyacak hafif servisleri backend'e ekleyip, React tarafında stadyum filtreli ve takvim görünümlü premium bir sayfa inşa edebiliriz!
