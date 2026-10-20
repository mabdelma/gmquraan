/**
 * The repository folder structure.
 *
 * The blueprint is explicit that folders are a presentation layer and the
 * metadata is the authority — "a document may appear in several views without
 * creating multiple uncontrolled copies". So this does not materialise a second
 * copy of the tree on disk beside the content store. It records the structure
 * as data, and the browser renders it.
 *
 * Empty folders are recorded too. The package marks them with `.keep` because
 * they are controlled locations in the information architecture, not accidents:
 * a folder that exists and is empty says "this belongs here and we have none
 * yet", which is different from the folder being absent.
 */
import { ZONES, type Zone } from "./config.js";
import { isGroupWide } from "./access.js";
import { memberCan } from "./permissions.js";
import type { GmRole } from "./config.js";

export type FolderNode = {
  path: string;
  name: string;
  depth: number;
  zone: Zone | null;
  children: FolderNode[];
  /** Documents filed directly here, not in a descendant. */
  documentCount: number;
  /** Including every descendant — what the browser shows on a closed folder. */
  totalCount: number;
};

/** The top-level zone a path belongs to, or null if it is not under one. */
export function zoneOf(path: string): Zone | null {
  const head = path.split("/")[0];
  return (ZONES as readonly string[]).includes(head) ? (head as Zone) : null;
}

/** Every ancestor of a path, closest last: a/b/c → ["a", "a/b"]. */
export function ancestorsOf(path: string): string[] {
  const parts = path.split("/").filter(Boolean);
  return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join("/"));
}

export const parentOf = (path: string): string | null => {
  const a = ancestorsOf(path);
  return a.length ? a[a.length - 1] : null;
};

/**
 * Build the folder tree.
 *
 * `folderPaths` are the controlled locations, including empty ones.
 * `documentPaths` are the full paths of documents the viewer may see — the
 * caller filters those, so this never has to know about permissions.
 *
 * Folders implied by a document path but missing from `folderPaths` are still
 * created. A document filed somewhere unrecorded should appear, not vanish
 * because the location was never declared.
 */
export function buildFolderTree(
  folderPaths: readonly string[],
  documentPaths: readonly string[]
): FolderNode {
  const root: FolderNode = { path: "", name: "", depth: -1, zone: null, children: [], documentCount: 0, totalCount: 0 };
  const index = new Map<string, FolderNode>([["", root]]);

  const ensure = (path: string): FolderNode => {
    const existing = index.get(path);
    if (existing) return existing;

    const parts = path.split("/");
    const node: FolderNode = {
      path,
      name: parts[parts.length - 1],
      depth: parts.length - 1,
      zone: zoneOf(path),
      children: [],
      documentCount: 0,
      totalCount: 0,
    };
    index.set(path, node);
    const parent = ensure(parts.slice(0, -1).join(""));
    parent.children.push(node);
    return node;
  };

  for (const p of folderPaths) if (p) ensure(p);

  for (const docPath of documentPaths) {
    const dir = parentOf(docPath) ?? "";
    const node = dir ? ensure(dir) : root;
    node.documentCount++;
  }

  // Roll counts upward once, rather than walking the tree per folder.
  const roll = (n: FolderNode): number => {
    n.totalCount = n.documentCount + n.children.reduce((sum, c) => sum + roll(c), 0);
    n.children.sort((a, b) => a.name.localeCompare(b.name));
    return n.totalCount;
  };
  roll(root);

  return root;
}

/** Find a folder by path. */
export function findFolder(root: FolderNode, path: string): FolderNode | null {
  if (!path) return root;
  let node: FolderNode | null = root;
  for (const part of path.split("/")) {
    node = node.children.find((c) => c.name === part) ?? null;
    if (!node) return null;
  }
  return node;
}

/**
 * Folders to show inside `node`.
 *
 * §13: "Users should not see folders they cannot access." A folder with no
 * documents the viewer may see is hidden — unless it is empty for everybody, in
 * which case it is a declared-but-unused location and showing it is honest
 * rather than a disclosure.
 */
export function visibleChildren(node: FolderNode, emptyForEveryone: (path: string) => boolean): FolderNode[] {
  return node.children.filter((c) => c.totalCount > 0 || emptyForEveryone(c.path));
}

/** Breadcrumb trail for a path, root first. */
export function breadcrumbs(path: string): { name: string; path: string }[] {
  if (!path) return [];
  const parts = path.split("/");
  return parts.map((name, i) => ({ name, path: parts.slice(0, i + 1).join("/") }));
}

/** A folder name reduced for display: "04_PEOPLE_AND_ORGANIZATION" → "People and organization". */
export function humanFolder(name: string): string {
  const withoutIndex = name.replace(/^\d+[_-]/, "");
  const words = withoutIndex.replace(/_/g, " ").toLowerCase().trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// ── Editing the structure ──────────────────────────────────────────────────
//
// Folder paths are also storage paths and URL parameters, so a name is not just
// a label. Everything below treats a name supplied by a person as hostile until
// it has been through nameProblem.

/**
 * Who may change the structure.
 *
 * The portal already has a notion of administrator — /admin gates on
 * isGroupWide — so this reuses it rather than inventing a third one. That is
 * the CEO, COO, CFO, CTO and the document controller, whose job this most
 * plainly is, plus anybody explicitly granted `administer`.
 *
 * Note that `administer` is not held by role except by infrastructure_admin:
 * for everybody else it is a grant, which is recorded, expires and can be
 * withdrawn. Reading it through memberCan keeps the `cannot` prohibition
 * absolute, so an agent identity cannot reach this by being granted anything.
 */
export function mayEditRepository(member: { role: GmRole; grantedCapabilities?: unknown }): boolean {
  return isGroupWide(member.role) || memberCan(member, "administer");
}

/** How deep the tree may go. Zone, section, subsection, and room to spare. */
export const MAX_FOLDER_DEPTH = 8;
const MAX_NAME = 64;

/**
 * Why this name cannot be used, or null.
 *
 * The separator, the traversal segments and the leading dot are the three that
 * matter: a name containing "/" invents a level nobody asked for, ".." climbs
 * out of the repository entirely, and a leading dot hides the folder from
 * every listing that skips dotfiles. The rest is house style.
 */
export function folderNameProblem(name: string): string | null {
  const n = name.trim();
  if (!n) return "Give the folder a name.";
  if (n.length > MAX_NAME) return `Folder names stop at ${MAX_NAME} characters.`;
  if (n.includes("/") || n.includes("\\")) {
    return "A folder name cannot contain a slash — create the folders one level at a time.";
  }
  if (n === "." || n === "..") return "That name is reserved.";
  if (n.startsWith(".")) return "A folder name cannot start with a dot.";
  // NUL and the C0 range: these end up in filesystem paths and HTTP headers.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(n)) return "That name contains characters that are not allowed.";
  if (!/^[A-Za-z0-9 _\-&().]+$/.test(n)) {
    return "Use letters, numbers, spaces and _ - & ( ) . only.";
  }
  if (n !== name) return "A folder name cannot start or end with a space.";
  return null;
}

/** Join a parent path and a new child name. */
export function childPath(parent: string, name: string): string {
  return parent ? `${parent}/${name}` : name;
}

/**
 * Whether `candidate` is `path` itself or sits underneath it.
 *
 * Compared segment by segment, because a string prefix test says
 * "04_PEOPLE" contains "04_PEOPLE_AND_ORGANIZATION" and it does not.
 */
export function isSelfOrDescendant(candidate: string, path: string): boolean {
  if (candidate === path) return true;
  return candidate.startsWith(`${path}/`);
}

export type FolderCreateInput = {
  parentPath: string;
  name: string;
  /** Every folder path that already exists, for the clash and depth checks. */
  existingPaths: readonly string[];
};

/** Why this folder cannot be created, or null. */
export function folderCreateProblem(input: FolderCreateInput): string | null {
  const nameIssue = folderNameProblem(input.name);
  if (nameIssue) return nameIssue;

  const parent = input.parentPath;
  if (parent && !input.existingPaths.includes(parent)) {
    return "The folder you are adding to no longer exists.";
  }

  const path = childPath(parent, input.name.trim());
  if (input.existingPaths.includes(path)) return "A folder with that name is already here.";

  const depth = path.split("/").length;
  if (depth > MAX_FOLDER_DEPTH) {
    return `Folders stop at ${MAX_FOLDER_DEPTH} levels deep.`;
  }
  // A top-level folder is a zone, and the zones are the access matrix. Inventing
  // one would create a location no role has a grant in, visible to nobody.
  if (!parent && !zoneOf(path)) {
    return "New top-level folders would be outside the access matrix — add inside an existing zone.";
  }
  return null;
}

export type FolderMoveInput = {
  from: string;
  /** The new parent. "" is not allowed — see the zone note in create. */
  toParent: string;
  /** The new name; unchanged for a pure move. */
  name: string;
  existingPaths: readonly string[];
  /** Deepest path under `from`, so a move cannot bury a subtree past the limit. */
  deepestDescendant?: string;
};

/** Why this folder cannot be renamed or moved, or null. */
export function folderMoveProblem(input: FolderMoveInput): string | null {
  const nameIssue = folderNameProblem(input.name);
  if (nameIssue) return nameIssue;

  if (!input.existingPaths.includes(input.from)) return "That folder no longer exists.";
  if (!zoneOf(input.from)) return "That folder is outside the access matrix and cannot be moved.";

  const target = childPath(input.toParent, input.name.trim());
  if (target === input.from) return "That is where it already is.";

  if (input.toParent && !input.existingPaths.includes(input.toParent)) {
    return "The destination folder no longer exists.";
  }
  if (!input.toParent) return "A folder cannot be moved to the top level.";

  // The one that silently destroys a tree: moving a folder inside itself
  // detaches it and everything under it from the root, and the rows survive
  // pointing at a parent that is now unreachable.
  if (isSelfOrDescendant(input.toParent, input.from)) {
    return "A folder cannot be moved inside itself.";
  }
  if (input.existingPaths.includes(target)) return "A folder with that name is already there.";

  // Moving a shallow folder deep can push its children past the limit even
  // though the folder itself fits.
  const deepest = input.deepestDescendant ?? input.from;
  const added = deepest.split("/").length - input.from.split("/").length;
  if (target.split("/").length + added > MAX_FOLDER_DEPTH) {
    return `That move would put folders more than ${MAX_FOLDER_DEPTH} levels deep.`;
  }
  return null;
}

/** Rewrite a descendant path when its ancestor moves from `from` to `to`. */
export function rewriteDescendant(path: string, from: string, to: string): string {
  if (path === from) return to;
  if (!isSelfOrDescendant(path, from)) return path;
  return to + path.slice(from.length);
}

export type FolderDeleteInput = {
  path: string;
  childFolders: number;
  /** Documents filed here or anywhere below. */
  documents: number;
  existingPaths: readonly string[];
};

/**
 * Why this folder cannot be deleted, or null.
 *
 * Deletion is refused while anything is inside. A recursive delete here would
 * take controlled records with it, and those have their own disposal route with
 * a retention check and two-person authorisation — deleting the folder must not
 * become a way around it.
 */
export function folderDeleteProblem(input: FolderDeleteInput): string | null {
  if (!input.existingPaths.includes(input.path)) return "That folder no longer exists.";
  if (!parentOf(input.path)) {
    return "Zones are the access matrix itself and cannot be deleted.";
  }
  if (input.childFolders > 0) {
    return `That folder still holds ${input.childFolders} folder${input.childFolders === 1 ? "" : "s"} — empty it first.`;
  }
  if (input.documents > 0) {
    return `That folder still holds ${input.documents} document${input.documents === 1 ? "" : "s"} — move or dispose of them first.`;
  }
  return null;
}

// ── Deleting a file ────────────────────────────────────────────────────────

/** States where nothing has ever been approved, so nothing controlled is lost. */
const NEVER_APPROVED: readonly string[] = ["DRAFT", "IN_REVIEW"];

export type FileDeleteInput = {
  state: string;
  legalHold?: boolean;
};

/**
 * Why an administrator cannot delete this file outright, or null.
 *
 * The split is deliberate. A draft uploaded into the wrong folder is working
 * material and an administrator should be able to remove it in one action.
 * Anything that reached APPROVED is a controlled record, and
 * document_lifecycle.yaml requires a retention check and two distinct
 * authorisers before it goes — so those keep the archive-then-dispose route
 * rather than gaining a shortcut. Legal hold stops both, always.
 */
export function fileDeleteProblem(input: FileDeleteInput): string | null {
  if (input.legalHold) return "The record is under legal hold and cannot be deleted.";
  if (!NEVER_APPROVED.includes(input.state)) {
    return `This record reached ${input.state.toLowerCase()}, so it is disposed of through archive and a two-person authorisation rather than deleted outright.`;
  }
  return null;
}
