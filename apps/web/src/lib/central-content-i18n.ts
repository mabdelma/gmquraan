import type { Locale } from "./i18n";

/**
 * Labels for the Projects and Vacancies managers in the central console.
 * Authored content (titles, bodies) is written by admins and never translated;
 * only the surrounding UI chrome is localised.
 */
export type CentralContent = {
  projects: { title: string; subtitle: string };
  vacancies: { title: string; subtitle: string };
  m: {
    new: string; create: string; edit: string; save: string; cancel: string;
    del: string; delConfirm: string; publish: string; unpublish: string; view: string;
    draft: string; live: string; publishNow: string;
    title: string; summary: string; body: string; cover: string;
    sector: string; status: string; statusPlanned: string; statusOngoing: string; statusCompleted: string;
    department: string; location: string; workMode: string; workOnSite: string; workRemote: string; workHybrid: string;
    jobType: string; typeFull: string; typePart: string; typeContract: string; typeInternship: string;
  };
};

const D: Record<Locale, CentralContent> = {
  en: {
    projects: { title: "Projects", subtitle: "Write and publish projects to /projects." },
    vacancies: { title: "Vacancies", subtitle: "Write and publish job openings to /careers." },
    m: {
      new: "New project", create: "Create", edit: "Edit", save: "Save", cancel: "Cancel",
      del: "Delete", delConfirm: "Delete this item?", publish: "Publish", unpublish: "Unpublish", view: "View",
      draft: "Draft", live: "Live", publishNow: "Publish now",
      title: "Title", summary: "Summary", body: "Body", cover: "Cover image URL (optional)",
      sector: "Sector slug (optional)", status: "Status", statusPlanned: "Planned", statusOngoing: "Ongoing", statusCompleted: "Completed",
      department: "Department (optional)", location: "Location", workMode: "Work mode", workOnSite: "On-site", workRemote: "Remote", workHybrid: "Hybrid",
      jobType: "Type", typeFull: "Full-time", typePart: "Part-time", typeContract: "Contract", typeInternship: "Internship"
    }
  },
  ar: {
    projects: { title: "المشاريع", subtitle: "اكتب وانشر المشاريع في /projects." },
    vacancies: { title: "الوظائف", subtitle: "اكتب وانشر الفرص الوظيفية في /careers." },
    m: {
      new: "مشروع جديد", create: "إنشاء", edit: "تعديل", save: "حفظ", cancel: "إلغاء",
      del: "حذف", delConfirm: "حذف هذا العنصر؟", publish: "نشر", unpublish: "إلغاء النشر", view: "عرض",
      draft: "مسودة", live: "منشور", publishNow: "انشر الآن",
      title: "العنوان", summary: "الملخص", body: "المحتوى", cover: "رابط الصورة (اختياري)",
      sector: "معرّف القطاع (اختياري)", status: "الحالة", statusPlanned: "مخطط له", statusOngoing: "قيد التنفيذ", statusCompleted: "مكتمل",
      department: "القسم (اختياري)", location: "الموقع", workMode: "نظام العمل", workOnSite: "حضوري", workRemote: "عن بُعد", workHybrid: "هجين",
      jobType: "النوع", typeFull: "دوام كامل", typePart: "دوام جزئي", typeContract: "تعاقد", typeInternship: "تدريب"
    }
  },
  es: {
    projects: { title: "Proyectos", subtitle: "Escribe y publica proyectos en /projects." },
    vacancies: { title: "Vacantes", subtitle: "Escribe y publica ofertas de empleo en /careers." },
    m: {
      new: "Nuevo proyecto", create: "Crear", edit: "Editar", save: "Guardar", cancel: "Cancelar",
      del: "Eliminar", delConfirm: "¿Eliminar este elemento?", publish: "Publicar", unpublish: "Despublicar", view: "Ver",
      draft: "Borrador", live: "Publicado", publishNow: "Publicar ahora",
      title: "Título", summary: "Resumen", body: "Contenido", cover: "URL de la imagen (opcional)",
      sector: "Slug del sector (opcional)", status: "Estado", statusPlanned: "Planificado", statusOngoing: "En curso", statusCompleted: "Completado",
      department: "Departamento (opcional)", location: "Ubicación", workMode: "Modalidad", workOnSite: "Presencial", workRemote: "Remoto", workHybrid: "Híbrido",
      jobType: "Tipo", typeFull: "Jornada completa", typePart: "Media jornada", typeContract: "Contrato", typeInternship: "Prácticas"
    }
  },
  fr: {
    projects: { title: "Projets", subtitle: "Rédigez et publiez des projets sur /projects." },
    vacancies: { title: "Postes", subtitle: "Rédigez et publiez des offres d'emploi sur /careers." },
    m: {
      new: "Nouveau projet", create: "Créer", edit: "Modifier", save: "Enregistrer", cancel: "Annuler",
      del: "Supprimer", delConfirm: "Supprimer cet élément ?", publish: "Publier", unpublish: "Dépublier", view: "Voir",
      draft: "Brouillon", live: "En ligne", publishNow: "Publier maintenant",
      title: "Titre", summary: "Résumé", body: "Contenu", cover: "URL de l'image (facultatif)",
      sector: "Slug du secteur (facultatif)", status: "Statut", statusPlanned: "Planifié", statusOngoing: "En cours", statusCompleted: "Terminé",
      department: "Département (facultatif)", location: "Lieu", workMode: "Modalité", workOnSite: "Sur site", workRemote: "À distance", workHybrid: "Hybride",
      jobType: "Type", typeFull: "Temps plein", typePart: "Temps partiel", typeContract: "Contrat", typeInternship: "Stage"
    }
  },
  
  pt: {
    projects: { title: "Projetos", subtitle: "Escreva e publique projetos em /projects." },
    vacancies: { title: "Vagas", subtitle: "Escreva e publique vagas em /careers." },
    m: {
      new: "Novo projeto", create: "Criar", edit: "Editar", save: "Salvar", cancel: "Cancelar",
      del: "Excluir", delConfirm: "Excluir este item?", publish: "Publicar", unpublish: "Despublicar", view: "Ver",
      draft: "Rascunho", live: "No ar", publishNow: "Publicar agora",
      title: "Título", summary: "Resumo", body: "Conteúdo", cover: "URL da imagem (opcional)",
      sector: "Slug do setor (opcional)", status: "Status", statusPlanned: "Planejado", statusOngoing: "Em andamento", statusCompleted: "Concluído",
      department: "Departamento (opcional)", location: "Local", workMode: "Modalidade", workOnSite: "Presencial", workRemote: "Remoto", workHybrid: "Híbrido",
      jobType: "Tipo", typeFull: "Tempo integral", typePart: "Meio período", typeContract: "Contrato", typeInternship: "Estágio"
    }
  }

  

};

export function getCentralContent(locale: Locale): CentralContent {
  return D[locale] ?? D.en;
}
