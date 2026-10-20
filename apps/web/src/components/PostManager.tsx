"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

type Post = { id: string; slug: string; title: string; excerpt: string | null; body: string; coverImage: string | null; published: boolean };

const L: Record<Locale, Record<string, string>> = {
  en: { newPost: "New post", title: "Title", excerpt: "Excerpt (optional)", cover: "Cover image URL (optional)", body: "Body", publishNow: "Publish now", create: "Create", edit: "Edit", save: "Save", cancel: "Cancel", del: "Delete", publish: "Publish", unpublish: "Unpublish", view: "View", draft: "Draft", live: "Live", delConfirm: "Delete this post?" },
  es: { newPost: "Nueva publicación", title: "Título", excerpt: "Extracto (opcional)", cover: "URL de imagen (opcional)", body: "Contenido", publishNow: "Publicar ahora", create: "Crear", edit: "Editar", save: "Guardar", cancel: "Cancelar", del: "Eliminar", publish: "Publicar", unpublish: "Despublicar", view: "Ver", draft: "Borrador", live: "Publicado", delConfirm: "¿Eliminar esta publicación?" },
  fr: { newPost: "Nouvel article", title: "Titre", excerpt: "Extrait (facultatif)", cover: "URL de l'image (facultatif)", body: "Contenu", publishNow: "Publier maintenant", create: "Créer", edit: "Modifier", save: "Enregistrer", cancel: "Annuler", del: "Supprimer", publish: "Publier", unpublish: "Dépublier", view: "Voir", draft: "Brouillon", live: "En ligne", delConfirm: "Supprimer cet article ?" },
  
  pt: { newPost: "Nova postagem", title: "Título", excerpt: "Resumo (opcional)", cover: "URL da imagem (opcional)", body: "Conteúdo", publishNow: "Publicar agora", create: "Criar", edit: "Editar", save: "Salvar", cancel: "Cancelar", del: "Excluir", publish: "Publicar", unpublish: "Despublicar", view: "Ver", draft: "Rascunho", live: "No ar", delConfirm: "Excluir esta postagem?" },

  ar: { newPost: "منشور جديد", title: "العنوان", excerpt: "مقتطف (اختياري)", cover: "رابط الصورة (اختياري)", body: "المحتوى", publishNow: "انشر الآن", create: "إنشاء", edit: "تعديل", save: "حفظ", cancel: "إلغاء", del: "حذف", publish: "نشر", unpublish: "إلغاء النشر", view: "عرض", draft: "مسودة", live: "منشور", delConfirm: "حذف هذا المنشور؟" }

  
};

const input = "w-full rounded-xl bg-[color:var(--surface)] border border-[color:var(--hairline)] px-3 py-2 text-sm outline-none focus:border-[color:var(--accent-text)]/60";

export function PostManager({ initial, locale = "en" }: { initial: Post[]; locale?: Locale }) {
  const router = useRouter();
  const t = L[locale] ?? L.en;
  const [posts, setPosts] = useState(initial);
  const [form, setForm] = useState({ title: "", excerpt: "", coverImage: "", body: "", published: false });
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ title: string; excerpt: string; body: string; coverImage: string }>({ title: "", excerpt: "", body: "", coverImage: "" });

  async function refresh() {
    const r = await fetch("/api/central/posts");
    const j = await r.json().catch(() => ({}));
    if (j.posts) setPosts(j.posts);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || busy) return;
    setBusy(true);
    const r = await fetch("/api/central/posts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    setBusy(false);
    if (r.ok) { setForm({ title: "", excerpt: "", coverImage: "", body: "", published: false }); await refresh(); router.refresh(); }
  }

  async function patch(id: string, data: Record<string, unknown>) {
    await fetch(`/api/central/posts/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    await refresh(); router.refresh();
  }

  async function del(id: string) {
    if (!confirm(t.delConfirm)) return;
    await fetch(`/api/central/posts/${id}`, { method: "DELETE" });
    await refresh(); router.refresh();
  }

  function startEdit(p: Post) {
    setEditId(p.id);
    setEdit({ title: p.title, excerpt: p.excerpt ?? "", body: p.body, coverImage: p.coverImage ?? "" });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={create} className="panel rounded-2xl p-6 space-y-3">
        <h2 className="text-lg font-bold">{t.newPost}</h2>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t.title} className={input} />
        <input value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder={t.excerpt} className={input} />
        <input value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} placeholder={t.cover} className={input} />
        <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder={t.body} rows={6} className={input} />
        <label className="flex items-center gap-2 text-sm text-[color:var(--ink)]/70 cursor-pointer">
          <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
          {t.publishNow}
        </label>
        <button disabled={busy} className="app-gradient text-[color:var(--on-accent)] font-bold rounded-lg px-4 py-2 text-sm disabled:opacity-40">{t.create}</button>
      </form>

      <div className="space-y-3">
        {posts.map((p) => (
          <div key={p.id} className="panel rounded-2xl p-4">
            {editId === p.id ? (
              <div className="space-y-2">
                <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} className={input} />
                <input value={edit.excerpt} onChange={(e) => setEdit({ ...edit, excerpt: e.target.value })} placeholder={t.excerpt} className={input} />
                <input value={edit.coverImage} onChange={(e) => setEdit({ ...edit, coverImage: e.target.value })} placeholder={t.cover} className={input} />
                <textarea value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} rows={6} className={input} />
                <div className="flex gap-2">
                  <button onClick={async () => { await patch(p.id, edit); setEditId(null); }} className="text-xs app-gradient text-[color:var(--on-accent)] font-bold rounded-lg px-3 py-1.5">{t.save}</button>
                  <button onClick={() => setEditId(null)} className="text-xs border border-[color:var(--hairline)] rounded-lg px-3 py-1.5">{t.cancel}</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs mt-0.5">
                    <span className={p.published ? "text-emerald-300" : "text-[color:var(--ink)]/50"}>{p.published ? t.live : t.draft}</span>
                    <span className="text-[color:var(--ink)]/30"> · /blog/{p.slug}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" className="text-xs border border-[color:var(--hairline)] rounded-lg px-3 py-1.5 hover:bg-[color:var(--overlay)]">{t.view}</a>
                  <button onClick={() => startEdit(p)} className="text-xs border border-[color:var(--hairline)] rounded-lg px-3 py-1.5 hover:bg-[color:var(--overlay)]">{t.edit}</button>
                  <button onClick={() => patch(p.id, { published: !p.published })} className="text-xs border border-[color:var(--hairline)] rounded-lg px-3 py-1.5 hover:bg-[color:var(--overlay)]">{p.published ? t.unpublish : t.publish}</button>
                  <button onClick={() => del(p.id)} className="text-xs border border-red-500/40 text-red-300 rounded-lg px-3 py-1.5 hover:bg-red-500/10">{t.del}</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
