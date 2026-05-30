export default function Contact() {
  return (
    <div className="bg-white/70 backdrop-blur-md border border-slate-100 rounded-3xl p-8 md:p-12 shadow-md space-y-8 animate-fadeIn max-w-4xl mx-auto text-slate-700">
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 uppercase tracking-wider mb-2">İletişim & Destek</h2>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
          Geri bildirimleriniz, iş birliği önerileriniz veya destek talepleriniz için bana her zaman ulaşabilirsiniz.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
        {/* Contact Info Card */}
        <div className="space-y-6">
          <h3 className="font-extrabold text-slate-800 text-base uppercase tracking-wide">İletişim Bilgileri</h3>
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-50 border border-emerald-100/50 text-emerald-600 rounded-xl shadow-sm">
              <span className="text-xl">📧</span>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">E-posta</div>
              <a href="mailto:ozencben@gmail.com" className="text-slate-700 font-extrabold text-sm hover:text-emerald-600 transition-colors mt-0.5 block">
                ozencben@gmail.com
              </a>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-cyan-50 border border-cyan-100/50 text-cyan-600 rounded-xl shadow-sm">
              <span className="text-xl">💬</span>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sosyal Ağlar</div>
              <p className="text-slate-500 text-xs leading-relaxed font-semibold mt-1">
                Aşağıdaki footer alanında yer alan sosyal medya linkleri üzerinden LinkedIn, GitHub ve Upwork profillerime erişebilirsiniz.
              </p>
            </div>
          </div>
        </div>

        {/* Message Mock Form */}
        <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl space-y-4 shadow-inner">
          <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Bir Mesaj Bırakın</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Adınız Soyadınız</label>
              <input type="text" placeholder="John Doe" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors" disabled />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Mesajınız</label>
              <textarea placeholder="Sorularınızı veya önerilerinizi buraya yazabilirsiniz..." rows={3} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors resize-none" disabled></textarea>
            </div>
            <button className="w-full py-3 bg-emerald-600/10 border border-emerald-600/20 text-emerald-600 font-extrabold text-xs uppercase tracking-wider rounded-xl opacity-60 cursor-not-allowed" disabled>
              Gönder (Şimdilik Devre Dışı)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
