"use client";

import { useState } from "react";
import { Trash2, RotateCcw, AlertTriangle, Loader2, Clock, FileText, Folder } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getDeletedProjectsAction,
  restoreProjectAction,
  purgeProjectAction,
  getDeletedDocumentsAction,
  restoreDocumentAction,
  purgeDocumentAction
} from "@/app/(dashboard)/projects/actions";
import { useRouter } from "next/navigation";

interface DeletedProject {
  id: string;
  name: string;
  deleted_at: string;
}

interface DeletedDocument {
  id: string;
  document_code: string;
  title: string;
  deleted_at: string;
  project_id: string;
  project_name: string;
}

export function TrashcanButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("projects");
  
  // Projects state
  const [projects, setProjects] = useState<DeletedProject[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  // Documents state
  const [documents, setDocuments] = useState<DeletedDocument[]>([]);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  
  // Specific action states
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"restore" | "purge" | null>(null);
  const [purgeConfirmId, setPurgeConfirmId] = useState<string | null>(null);
  
  const router = useRouter();

  const loadDeletedProjects = async () => {
    setIsProjectsLoading(true);
    setProjectsError(null);
    try {
      const res = await getDeletedProjectsAction();
      if ("error" in res && res.error) {
        setProjectsError(res.error);
      } else if ("projects" in res) {
        setProjects(res.projects || []);
      }
    } catch (err) {
      setProjectsError("Error al conectar con el servidor.");
    } finally {
      setIsProjectsLoading(false);
    }
  };

  const loadDeletedDocuments = async () => {
    setIsDocsLoading(true);
    setDocsError(null);
    try {
      const res = await getDeletedDocumentsAction();
      if ("error" in res && res.error) {
        setDocsError(res.error);
      } else if ("documents" in res) {
        setDocuments(res.documents || []);
      }
    } catch (err) {
      setDocsError("Error al conectar con el servidor.");
    } finally {
      setIsDocsLoading(false);
    }
  };

  const loadAll = async () => {
    await Promise.all([loadDeletedProjects(), loadDeletedDocuments()]);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      loadAll();
    } else {
      setPurgeConfirmId(null);
    }
  };

  const handleRestoreProject = async (id: string) => {
    setActionPendingId(id);
    setActionType("restore");
    try {
      const res = await restoreProjectAction(id);
      if (res.error) {
        alert(res.error);
      } else {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        router.refresh();
      }
    } catch (err) {
      alert("Error al restaurar el proyecto.");
    } finally {
      setActionPendingId(null);
      setActionType(null);
    }
  };

  const handlePurgeProject = async (id: string) => {
    setActionPendingId(id);
    setActionType("purge");
    try {
      const res = await purgeProjectAction(id);
      if (res.error) {
        alert(res.error);
      } else {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        setPurgeConfirmId(null);
        router.refresh();
      }
    } catch (err) {
      alert("Error al eliminar definitivamente.");
    } finally {
      setActionPendingId(null);
      setActionType(null);
    }
  };

  const handleRestoreDocument = async (id: string) => {
    setActionPendingId(id);
    setActionType("restore");
    try {
      const res = await restoreDocumentAction(id);
      if (res.error) {
        alert(res.error);
      } else {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        router.refresh();
      }
    } catch (err) {
      alert("Error al restaurar el documento.");
    } finally {
      setActionPendingId(null);
      setActionType(null);
    }
  };

  const handlePurgeDocument = async (id: string) => {
    setActionPendingId(id);
    setActionType("purge");
    try {
      const res = await purgeDocumentAction(id);
      if (res.error) {
        alert(res.error);
      } else {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        setPurgeConfirmId(null);
        router.refresh();
      }
    } catch (err) {
      alert("Error al eliminar definitivamente.");
    } finally {
      setActionPendingId(null);
      setActionType(null);
    }
  };

  const calculateDaysLeft = (deletedAt: string) => {
    const deletedDate = new Date(deletedAt).getTime();
    const now = Date.now();
    const msDiff = now - deletedDate;
    const daysDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));
    const left = 30 - daysDiff;
    return left > 0 ? left : 0;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger render={
        <Button variant="outline" className="border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer h-9 px-4 flex items-center gap-1.5 rounded-lg text-sm font-medium">
          <Trash2 className="h-4 w-4" />
          Papelera
        </Button>
      } />
      
      <DialogContent className="sm:max-w-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xl max-h-[85vh] flex flex-col">
        <DialogHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-900">
          <DialogTitle className="text-base font-bold flex items-center gap-2 font-sans text-zinc-900 dark:text-zinc-100">
            <Trash2 className="h-5 w-5 text-zinc-500" />
            Papelera de Reciclaje
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Los elementos eliminados se conservan aquí por un período máximo de **30 días** antes de su purga definitiva.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setPurgeConfirmId(null); }} className="w-full flex-1 flex flex-col min-h-0 mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg mb-4">
            <TabsTrigger value="projects" className="text-xs font-semibold py-1.5 rounded-md flex items-center justify-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-950 shadow-xs">
              <Folder className="h-3.5 w-3.5" />
              Proyectos ({projects.length})
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs font-semibold py-1.5 rounded-md flex items-center justify-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-950 shadow-xs">
              <FileText className="h-3.5 w-3.5" />
              Documentos ({documents.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto min-h-[250px] max-h-[350px] space-y-3 pr-1">
            <TabsContent value="projects" className="mt-0 outline-none">
              {isProjectsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-400">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs">Cargando proyectos...</p>
                </div>
              ) : projectsError ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-red-500">
                  <AlertTriangle className="h-8 w-8 text-red-500/80" />
                  <p className="text-xs font-semibold">{projectsError}</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-400 dark:text-zinc-600">
                  <Trash2 className="h-10 w-10 stroke-[1.5]" />
                  <p className="text-xs italic text-center">No hay proyectos en la papelera.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {projects.map((proj) => {
                    const daysLeft = calculateDaysLeft(proj.deleted_at);
                    const isConfirmingPurge = purgeConfirmId === proj.id;
                    const isPending = actionPendingId === proj.id;

                    return (
                      <div 
                        key={proj.id} 
                        className="p-3 border border-zinc-150 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-900/5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all"
                      >
                        <div className="space-y-1 max-w-sm">
                          <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate font-sans">
                            {proj.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Eliminado: {new Date(proj.deleted_at).toLocaleDateString()}
                            </span>
                            <span className={`font-semibold ${daysLeft <= 5 ? "text-red-500" : "text-amber-600"}`}>
                              Faltan {daysLeft} {daysLeft === 1 ? "día" : "días"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 justify-end shrink-0">
                          {isConfirmingPurge ? (
                            <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-950/30 p-1 rounded-lg">
                              <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold px-1.5">¿Seguro?</span>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white text-[10px] h-6 px-2"
                                onClick={() => handlePurgeProject(proj.id)}
                                disabled={isPending}
                              >
                                {isPending && actionType === "purge" ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : null}
                                Sí
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-[10px] h-6 px-1.5 text-zinc-500 dark:text-zinc-400"
                                onClick={() => setPurgeConfirmId(null)}
                                disabled={isPending}
                              >
                                No
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-[#3e689a] hover:text-[#2e3e56] hover:bg-[#3e689a]/10 text-[11px] h-7 gap-1 cursor-pointer font-sans"
                                onClick={() => handleRestoreProject(proj.id)}
                                disabled={isPending}
                              >
                                {isPending && actionType === "restore" ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-[#3e689a]" />
                                ) : (
                                  <RotateCcw className="h-3 w-3" />
                                )}
                                Restaurar
                              </Button>

                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 text-[11px] h-7 gap-1 cursor-pointer font-sans"
                                onClick={() => setPurgeConfirmId(proj.id)}
                                disabled={isPending}
                              >
                                <Trash2 className="h-3 w-3" />
                                Eliminar
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="mt-0 outline-none">
              {isDocsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-400">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs">Cargando documentos...</p>
                </div>
              ) : docsError ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-red-500">
                  <AlertTriangle className="h-8 w-8 text-red-500/80" />
                  <p className="text-xs font-semibold">{docsError}</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-400 dark:text-zinc-600">
                  <Trash2 className="h-10 w-10 stroke-[1.5]" />
                  <p className="text-xs italic text-center">No hay documentos en la papelera.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {documents.map((doc) => {
                    const daysLeft = calculateDaysLeft(doc.deleted_at);
                    const isConfirmingPurge = purgeConfirmId === doc.id;
                    const isPending = actionPendingId === doc.id;

                    return (
                      <div 
                        key={doc.id} 
                        className="p-3 border border-zinc-150 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-900/5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all"
                      >
                        <div className="space-y-1 max-w-sm min-w-0 flex-1">
                          <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 block uppercase truncate">
                            Proyecto: {doc.project_name}
                          </span>
                          <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate font-mono">
                            {doc.document_code}
                          </h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            {doc.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-zinc-400 dark:text-zinc-500 pt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(doc.deleted_at).toLocaleDateString()}
                            </span>
                            <span className={`font-semibold ${daysLeft <= 5 ? "text-red-500" : "text-amber-600"}`}>
                              Faltan {daysLeft} {daysLeft === 1 ? "día" : "días"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 justify-end shrink-0">
                          {isConfirmingPurge ? (
                            <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-950/30 p-1 rounded-lg">
                              <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold px-1.5">¿Seguro?</span>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white text-[10px] h-6 px-2"
                                onClick={() => handlePurgeDocument(doc.id)}
                                disabled={isPending}
                              >
                                {isPending && actionType === "purge" ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : null}
                                Sí
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-[10px] h-6 px-1.5 text-zinc-500 dark:text-zinc-400"
                                onClick={() => setPurgeConfirmId(null)}
                                disabled={isPending}
                              >
                                No
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-[#3e689a] hover:text-[#2e3e56] hover:bg-[#3e689a]/10 text-[11px] h-7 gap-1 cursor-pointer font-sans"
                                onClick={() => handleRestoreDocument(doc.id)}
                                disabled={isPending}
                              >
                                {isPending && actionType === "restore" ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-[#3e689a]" />
                                ) : (
                                  <RotateCcw className="h-3 w-3" />
                                )}
                                Restaurar
                              </Button>

                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 text-[11px] h-7 gap-1 cursor-pointer font-sans"
                                onClick={() => setPurgeConfirmId(doc.id)}
                                disabled={isPending}
                              >
                                <Trash2 className="h-3 w-3" />
                                Eliminar
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="pt-4 border-t border-zinc-100 dark:border-zinc-900 mt-4">
          <DialogTrigger render={
            <Button variant="outline" className="cursor-pointer">Cerrar</Button>
          } />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
