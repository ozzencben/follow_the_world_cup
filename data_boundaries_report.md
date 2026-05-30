# 📊 Dünya Kupası 2026 Veri Sınırları ve Analiz Raporu (Data Boundaries & Limits)

Bu rapor, **FollowTheWorldCup.com** projesinin veri katmanını oluşturan `backend/app/data` dizinindeki tüm dosyaları, bu dosyaların içerdikleri şemaları, simülasyon motorunda nasıl harmanlandıklarını ve veri kümemizin sahip olduğu teknik sınırları (boundaries/limits) detaylıca ele almaktadır.

---

## 📂 1. Veri Dosyalarının Listesi ve Detaylı Şemaları

Projenin veri motoru, 3 farklı ana kaynağı (FIFA resmi verileri, Transfermarkt finansal/fiziksel istatistikleri ve Dünya Kupası ELO derecelendirmeleri) birleştirerek çalışır.

### A. ELO Derecelendirme Verileri (`backend/app/data/elo/`)

Bu klasör, takımların teknik güç durumlarını ve son form grafiklerini tutan TSV (Tab-Separated Values) dosyalarını barındırır.

#### 1. `2026_World_Cup.tsv` (Ana ELO Dosyası)
*   **İçerik:** 48 Dünya Kupası katılımcısının tamamının kümülatif ELO geçmişini tutan 48 satırlık ana dosyadır.
*   **Kilit Kolonlar:**
    *   `Col 0-1:` Yerel ve Global ELO Sıralaması (`localRank`, `globalRank`)
    *   `Col 2:` 2 Karakterli Ülke Kodu (`code` - Örn: `TR`, `AR`, `FR`)
    *   `Col 3:` Güncel ELO Puanı (`rating` - Örn: Türkiye `1902`, İspanya `2165`)
    *   `Col 4-9:` Tarihsel ELO zirve ve dip sınırları (`peakRating`, `lowRating` vb.)
    *   `Col 14-15:` Son 1 yıldaki ELO ve Sıra Değişimi (`oneYearRankChange`, `oneYearRatingChange`)
    *   `Col 22-25:` Toplam, Ev Sahibi, Deplasman ve Tarafsız Saha Maç Adetleri
    *   `Col 26-28:` Galibiyet, Yenilgi, Beraberlik Sayıları
    *   `Col 29-30:` Atılan ve Yenilen Toplam Gol Sayıları
*   **Kullanım Amacı:** CSR formülünün ELO omurgasını (%55) ve Poisson modelinin maç başı gol ortalamalarını (`goalsForAvg`, `goalsAgainstAvg`) hesaplamak için kullanılır.

#### 2. `2026_World_Cup_latest.tsv` (Son Form Kronolojisi)
*   **İçerik:** Takımların en güncel maç geçmişini (Mayıs 2026 sonuna kadar) tarih, skor, rakip ve ELO değişimleriyle tutar.
*   **Kilit Kolonlar:** Tarih, Takım 1, Takım 2, Skor 1, Skor 2, Maç Türü (Örn: `F` - Dostluk, `WQ` - Elemeler), ELO Değişimi.
*   **Kullanım Amacı:** Takımların son form grafiklerini (`get_team_form`) ve son 8 maçtaki performans trendlerini hesaplamak.

#### 3. `2026_World_Cup_fixtures.tsv` (Olasılık Tahminleri)
*   **İçerik:** ELO analitiğine göre oynanacak maçların yüzde kaç ihtimalle Ev Sahibi Galibiyeti, Beraberlik veya Deplasman Galibiyeti ile biteceğini gösteren teorik tahmin verileridir.

#### 4. `2026_World_Cup_graph.tsv` (Trajectory Başlangıç Değerleri)
*   **İçerik:** Takımların ELO gelişim grafiklerini çizmek için Şubat 2026 tarihindeki başlangıç ELO puanlarını tek satırda birleşik string formatında tutar.

---

### B. Finansal ve Kadro Verileri (`backend/app/data/`)

#### 5. `transfermarkt_stats.json`
*   **İçerik:** Takımların Transfermarkt'tan çekilen kadro kalitesi ve yaş ortalaması istatistikleridir.
*   **Şema:**
    ```json
    "Fransa": {
        "team_name": "Fransa",
        "player_count": 26,
        "average_age": 27.0,
        "world_cup_appearances": 17,
        "squad_value_million_eur": 1480.0,
        "raw_value_text": "1.48 milyar €"
    }
    ```
*   **Kullanım Amacı:** CSR formülünün finansal derinlik (%20) girdisini hesaplamak için kullanılır.

---

### C. Resmi FIFA ve Turnuva Yapısı Verileri (`backend/app/data/`)

#### 6. `fifa_data.json`
*   **İçerik:** FIFA resmi sıralamaları, katılım sayıları ve takım renk şemaları.
*   **Şema:**
    ```json
    {
        "teamId": "43911",
        "teamName": "Mexico",
        "teamFlag": "https://api.fifa.com/api/v3/picture/flags-{format}-{size}/MEX",
        "worldRanking": 15,
        "appearances": 17,
        "hostTeam": true,
        "teamEnrichmentData": {
            "primaryColor": "#27A550",
            "secondaryColor": "#EA0000"
        }
    }
    ```
*   **Kullanım Amacı:** Ev sahibi bonusunun (%10 CSR) tespiti, takım renk kodları ve resmi logoların arayüze basılması.

#### 7. `winners.json`
*   **İçerik:** 1930'dan 2022'ye kadar Dünya Kupası'nı kazanmış tüm takımların ve teknik direktörlerin listesi.
*   **Şema:**
    ```json
    {
        "year": 2022,
        "country_tr": "Arjantin",
        "country_en": "Argentina",
        "manager": "Lionel Scaloni"
    }
    ```
*   **Kullanım Amacı:** Turnuva DNA'sını (%10 CSR) hesaplamak için ülkelerin şampiyonluk sayılarını toplamak.

#### 8. `squads.json`
*   **İçerik:** 48 takımın 2026 gruplarına (`group`: `a`'dan `l`'ye) dağılımı ve resmi turnuva kısaltmaları (`abbr`).
*   **Kullanım Amacı:** Takımların simülasyon başlangıcında hangi torbaya ve gruba yerleşeceğini belirlemek.

#### 9. `rounds.json`
*   **İçerik:** 72 grup maçının tamamının stadyum, tarih, saat ve fikstür eşleşme şeması.
*   **Kullanım Amacı:** Grup maçlarının fikstür takvimini oluşturarak simülasyonu tetikleyen başlangıç maç listesini kurmak.

---

## 🔗 2. Veri Kaynaklarının Birleştirilmesi ve Kod Eşleme Katmanı

Bu dosyaların hepsi farklı isimlendirmeler kullanmaktadır. Bu uyumsuzluğu çözmek için hem Python backend tarafında hem de TypeScript frontend tarafında **Altın Haritalama Sözlüğü (Golden Mapping)** kullanılır.

*   **Örnek Sorun:** "USA" FIFA'da `USA` iken, ELO'da `US` koduyla geçer. Transfermarkt'ta ise `"Amerika Birleşik Devletleri"` Türkçe anahtarıyla kayıtlıdır. "Congo DR" ise ELO'da `CD` iken Transfermarkt'ta `"Demokratik Kongo Cumhuriyeti"` olarak geçer.
*   **Çözüm (Python `GOLDEN_COUNTRY_MAP`):**
    ```python
    "US": {"en": "USA", "tr": "ABD", "conf": "CONCACAF", "tm": "Amerika Birleşik Devletleri"},
    "CD": {"en": "Congo DR", "tr": "Kongo DR", "conf": "CAF", "tm": "Demokratik Kongo Cumhuriyeti"}
    ```
*   **Çözüm (TypeScript `nameToCodeMap`):**
    İsimler normalize edilerek (küçük harfe çevirme, özel karakterleri/boşlukları silme, unicode harfleri ASCII'ye dönüştürme) bu sözlük üzerinden ortak 2 harfli ülke koduna (`ES`, `TR`, `AR` vb.) eşitlenir.

---

## 🚫 3. Verilerin Sınırları ve Kısıtlamaları (Data Boundaries)

Simülasyon motorunu çalıştırırken ve geliştirirken bilmemiz gereken **teknik veri sınırları** şunlardır:

### 1. Zaman Duraklaması Sınırı (Static Temporal Snapshot)
*   **Kısıt:** ELO ve Transfermarkt verilerimiz **29 Mayıs 2026** tarihli statik birer enstantanedir (snapshot).
*   **Sonuç:** Dünya Kupası başladıktan sonra takımların gerçek hayatta yapacağı hazırlık maçları veya sakatlıklar bu dosyaları dinamik olarak güncellemez. Veriler turnuva başlangıcı itibarıyla dondurulmuştur.

### 2. Simülasyon Esnasında ELO Dalgalanması Yoktur (No Dynamic ELO Drift)
*   **Kısıt:** Grup maçlarında Türkiye Portekiz'i yendiğinde, Türkiye'nin simüle edilen ELO puanı gerçek zamanlı olarak artmaz; Portekiz'inki de azalmaz.
*   **Sonuç:** Simülatör, turnuva boyunca takımların turnuva başlangıcındaki CSR (Kompozit Güç) değerlerini sabit girdi olarak kullanır. Sonraki maçlara yansıyan dinamik bir "yorgunluk" veya "moral/özgüven dalgalanması" katsayısı yoktur.

### 3. Logaritmik Sıkıştırma Limiti (Financial Cap)
*   **Kısıt:** Kadro piyasa değerleri doğrusal değil logaritmik olarak CSR'a katılır.
*   **Sonuç:** Kadro değeri 1.48 Milyar € olan Fransa ile 536 Milyon € olan Türkiye arasındaki fark, 3 kat değil, logaritmik olarak $\approx 1.2$ kat güç farkı şeklinde formüle yansır. Bu durum sürprizlerin önünü açar ancak finansal uçurumu bir nebze yumuşatır.

### 4. Gol Sayısı Sınırı (Poisson Truncation)
*   **Kısıt:** Knuth Poisson algoritmasında üretilen gol sayısı tavanı **6 gol** ile sınırlandırılmıştır (`Math.min(6, score)`).
*   **Sonuç:** Futbol tarihinde nadir görülen 7-5, 8-2 gibi ekstrem veya absürt skorlar simülasyon modelimizde matematiksel olarak üretilemez.

### 5. Yazı-Tura Olmaması (No Coin-Toss / Lots Fallback)
*   **Kısıt:** Grup üçüncülükleri veya puan tablosu eşitliklerinde tüm kriterler (Puan $\rightarrow$ Averaj $\rightarrow$ Atılan Gol) eşit çıktığında, motor doğrudan **CSR gücü yüksek olan (favori)** takımı üst tura taşır.
*   **Sonuç:** Gerçek futbolda olan "kura çekimi (drawing of lots)" veya "yazı-tura" gibi %50-%50 şans faktörü yerine, eşitlik durumunda sistem her zaman güçlü olanın hakkını gözetir.

### 6. Kadro Değişikliklerinin Yansımaması
*   **Kısıt:** `squads.json` dosyası sadece takımların grup yerleşimlerini ve dünya sıralamalarını tutar, oyuncu oyuncu kadro isimlerini barındırmaz.
*   **Sonuç:** Bir takımın golcüsünün (Örn: Haaland veya Mbappe) sakatlanması durumunda simülasyon gücünü düşürebileceğimiz bir oyuncu bazlı alt-katman veri şemamız bulunmamaktadır. Güç puanları tamamen takım düzeyindedir.
