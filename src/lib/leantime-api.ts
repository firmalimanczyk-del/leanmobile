// ============================================================
// leantime-api.ts — Warstwa komunikacji z Leantime JSON-RPC
// ARCHITEKTURA: przeglądarka → Next.js API proxy → Leantime
// (proxy rozwiązuje CORS gdy app jest na Railway.app)
// ============================================================

// Wszystkie żądania idą przez lokalne API proxy Next.js:
// /api/jsonrpc    → proxy do LEANTIME_URL/api/jsonrpc (server-side)
// /api/auth/login → proxy do LEANTIME_URL/auth/login
// /api/auth/logout → proxy do LEANTIME_URL/auth/logout
const TZ = 'Europe/Warsaw';

// ─── Typy ────────────────────────────────────────────────────

export interface LtUser {
    id: string | number;
    firstname?: string;
    lastname?: string;
    username?: string;
    email?: string;
    user?: string;
}

export interface LtProject {
    id: string | number;
    name?: string;
    projectName?: string;
    clientName?: string;
    state?: string | number;
    status?: string;
    numberOfTickets?: number;
}

export interface LtTask {
    id: string | number;
    headline?: string;
    title?: string;
    description?: string;
    status?: string | number;
    priority?: string;
    projectId?: string | number;
    projectName?: string;
    editorId?: string | number;
    editorFirstname?: string;
    editorLastname?: string;
    userId?: string | number;
    userFirstname?: string;
    userLastname?: string;
    dateToFinish?: string;
    editFrom?: string;
    editTo?: string;
    date?: string;
    tags?: string;
    type?: string;
    milestoneid?: string | number;
    milestoneHeadline?: string;
    responsible?: string | number;
}

export interface LtMilestone {
    id: string | number;
    headline?: string;
    title?: string;
    type?: string;
}

export interface LtStatusLabel {
    v: string;
    l: string;
    c: string;
}

export interface LtComment {
    id: string | number;
    text?: string;
    description?: string;
    comment?: string;
    content?: string;
    commentType?: number;
    status?: string | number;
    date?: string;
    created?: string;
    modified?: string;
    moduleId?: string | number;
    entityId?: string | number;
    projectId?: string | number;
    userId?: string | number;
    userFirstname?: string;
    userLastname?: string;
    firstname?: string;
    lastname?: string;
    author?: string;
    createdByName?: string;
    userEmail?: string;
    email?: string;
    userName?: string;
    username?: string;
    user?: string | { email?: string; username?: string };
    createdBy?: string | number;
}

// ─── Helpers ─────────────────────────────────────────────────

export function toArr<T>(d: unknown): T[] {
    if (Array.isArray(d)) return d as T[];
    if (d && typeof d === 'object') return Object.values(d) as T[];
    return [];
}

export function toUTC(d: unknown): string | null {
    if (!d) return null;
    const s = String(d);
    if (s === '0000-00-00 00:00:00' || s === '0000-00-00') return null;
    if (!s.includes('T') && !s.includes('Z')) return s.replace(' ', 'T') + 'Z';
    if (!s.includes('Z') && !s.includes('+') && s.includes('T')) return s + 'Z';
    return s;
}

export function dsDate(d: unknown): string {
    const u = toUTC(d);
    if (!u) return '';
    try {
        return new Date(u).toLocaleDateString('en-CA', { timeZone: TZ });
    } catch {
        return '';
    }
}

export function fmtDate(d: unknown): string {
    const u = toUTC(d);
    if (!u) return '';
    try {
        return new Date(u).toLocaleDateString('pl-PL', {
            day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ,
        });
    } catch { return String(d); }
}

export function fmtDateTime(d: unknown): string {
    const u = toUTC(d);
    if (!u) return '';
    try {
        return new Date(u).toLocaleString('pl-PL', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZone: TZ,
        });
    } catch { return String(d); }
}

export function fmtShort(d: unknown): string {
    const u = toUTC(d);
    if (!u) return '';
    try {
        return new Date(u).toLocaleDateString('pl-PL', {
            day: 'numeric', month: 'short', timeZone: TZ,
        });
    } catch { return String(d); }
}

export function toDTLocal(d: unknown): string {
    if (!d || d === '0000-00-00 00:00:00' || d === '0000-00-00') return '';
    try {
        const u = toUTC(d);
        if (!u) return '';
        const dt = new Date(u);
        if (isNaN(dt.getTime())) return '';
        const p = new Intl.DateTimeFormat('en-CA', {
            timeZone: TZ, year: 'numeric', month: '2-digit',
            day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
        }).formatToParts(dt);
        const g: Record<string, string> = {};
        p.forEach((x) => { if (x.type !== 'literal') g[x.type] = x.value; });
        return `${g.year}-${g.month}-${g.day}T${g.hour}:${g.minute}`;
    } catch { return ''; }
}

export function nowWarsaw(): string {
    return new Date().toLocaleString('sv-SE', { timeZone: TZ }).replace(' ', 'T');
}

export function getCommentAuthor(c: LtComment, allUsers: LtUser[]): string {
    if (c.firstname || c.lastname) {
        const n = `${c.firstname || ''} ${c.lastname || ''}`.trim();
        if (n) return n;
    }
    if (c.userFirstname || c.userLastname) {
        const n = `${c.userFirstname || ''} ${c.userLastname || ''}`.trim();
        if (n) return n;
    }
    if (c.author) return c.author;
    if (c.createdByName) return c.createdByName;
    if (c.userEmail) return c.userEmail;
    if (c.email) return c.email;
    if (c.userName) return c.userName;
    if (c.username) return c.username;
    if (c.user) return typeof c.user === 'string' ? c.user : (c.user.email || c.user.username || '');
    const uid = c.userId || c.createdBy;
    if (uid) {
        const u = allUsers.find((x) => String(x.id) === String(uid));
        if (u) {
            const n = `${u.firstname || ''} ${u.lastname || ''}`.trim();
            return n || u.email || u.username || `Użytkownik #${uid}`;
        }
        return `Użytkownik #${uid}`;
    }
    return '';
}

// ─── JSON-RPC core ───────────────────────────────────────────

async function rpc(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (attempt > 0) {
            await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
        }
        const r = await fetch('/api/jsonrpc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                jsonrpc: '2.0',
                method,
                id: `${Date.now()}${Math.random()}`,
                params,
            }),
        });
        if (r.status === 429) {
            if (attempt < maxRetries - 1) {
                await new Promise((res) => setTimeout(res, 5000));
                continue;
            }
            throw new Error('Zbyt wiele zapytań — spróbuj ponownie za chwilę');
        }
        // Sprawdź typ odpowiedzi zanim próbujemy JSON.parse
        const contentType = r.headers.get('content-type') || '';
        const raw = await r.text();
        if (!r.ok) {
            throw new Error(`HTTP ${r.status}: ${raw.substring(0, 200)}`);
        }
        // Leantime zwraca HTML gdy sesja wygasła lub metoda rzuca redirect
        if (raw.trimStart().startsWith('<')) {
            throw new Error('Leantime zwrócił HTML zamiast JSON – sesja wygasła lub błąd serwera');
        }
        let d: { error?: { message?: string; code?: number }; result?: unknown };
        try {
            d = JSON.parse(raw);
        } catch {
            throw new Error(`Nieprawidłowa odpowiedź JSON: ${raw.substring(0, 100)}`);
        }
        if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
        return d.result;
    }
}

// ─── AUTH ────────────────────────────────────────────────────

export async function apiLogin(email: string, password: string): Promise<boolean> {
    try {
        // Serwer Railway wykona cały flow logowania (GET+POST do Leantime)
        // i ustawi ciasteczko lt_sess na domenie Railway — bez problemu CORS
        const resp = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'same-origin',
        });
        const data = await resp.json();
        return data.ok === true;
    } catch {
        return false;
    }
}

export async function apiLogout(): Promise<void> {
    try {
        await fetch('/api/auth/logout', { credentials: 'same-origin' });
    } catch { /* ignore */ }
}

// ─── USERS ───────────────────────────────────────────────────

export async function apiGetUsers(): Promise<LtUser[]> {
    const d = await rpc('leantime.rpc.users.getAll');
    return toArr<LtUser>(d);
}

// ─── PROJECTS ────────────────────────────────────────────────

export async function apiGetProjects(): Promise<LtProject[]> {
    const d = await rpc('leantime.rpc.projects.getAll');
    return toArr<LtProject>(d);
}

export function isProjectActive(p: LtProject): boolean {
    const s = p.state != null ? Number(p.state) : 0;
    return s !== 1 && s !== -1 && p.status !== 'closed' && p.status !== 'archived';
}

// ─── STATUS LABELS ───────────────────────────────────────────

const STATUS_CLASS_COLORS: Record<string, string> = {
    new: '#2563EB', info: '#2563EB',
    blocked: '#DC3545', important: '#DC3545', danger: '#DC3545',
    inprogress: '#F59E0B', dark: '#F59E0B',
    review: '#F5A623', warning: '#F5A623',
    done: '#28A745', success: '#28A745',
    archived: '#6B7280', default: '#6B7280', muted: '#6B7280',
};
const FALLBACK_COLORS = ['#2563EB', '#DC3545', '#F59E0B', '#F5A623', '#28A745', '#6B7280', '#94a3b8'];

function guessColor(cls: string, idx: number): string {
    if (cls) {
        const k = cls.replace(/^label-/, '').toLowerCase();
        if (STATUS_CLASS_COLORS[k]) return STATUS_CLASS_COLORS[k];
    }
    return FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

// ── Fallback lista statusów (bez Zarchiwizowane — nie wyświetlamy w LeanMobile) ──
export const FALLBACK_STATUS_LIST: LtStatusLabel[] = [
    { v: '3', l: 'Nowe', c: '#2563EB' },
    { v: '1', l: 'Zablokowane', c: '#DC3545' },
    { v: '4', l: 'W toku', c: '#F59E0B' },
    { v: '2', l: 'Oczekuje na akceptację', c: '#F5A623' },
    { v: '0', l: 'Zrobione', c: '#28A745' },
];

// Statusy ukryte w UI (nie wyświetlamy w StatusSheet, Kanban itp.)
const HIDDEN_STATUSES = new Set(['-1']);

// Statusy uznawane za "zakończone" — Leantime statusType DONE = 0 (done) i -1 (archived)
export const DONE_STATUSES = new Set(['0', '-1']);

// Leantime zwraca klucze tłumaczeń (np. "status.new") zamiast gotowych nazw
const LEANTIME_I18N: Record<string, string> = {
    'status.new': 'Nowe',
    'status.blocked': 'Zablokowane',
    'status.in_progress': 'W toku',
    'status.in_review': 'W przeglądzie',
    'status.waiting_for_approval': 'Oczekuje na akceptację',
    'status.done': 'Zrobione',
    'status.archived': 'Zarchiwizowane',
};
function translateLabel(raw: string): string {
    return LEANTIME_I18N[raw] || raw;
}

export async function apiGetStatusLabels(): Promise<LtStatusLabel[]> {
    try {
        const raw = await rpc('leantime.rpc.tickets.getStatusLabels');
        console.log('[STATUS-DEBUG] raw getStatusLabels response:', JSON.stringify(raw));
        if (raw && typeof raw === 'object') {
            const list: LtStatusLabel[] = [];
            if (!Array.isArray(raw)) {
                // Format Leantime 3.x: { "3": { name: "status.new", class: "label-info", statusType: "NEW", sortKey: 1 }, ... }
                // lub starszy: { "3": "Nowe", ... }
                const entries = Object.entries(raw as Record<string, unknown>);
                // Sortuj wg sortKey jeśli dostępne
                const sorted = entries.sort((a, b) => {
                    const aSort = typeof a[1] === 'object' && a[1] !== null ? ((a[1] as Record<string, unknown>).sortKey as number ?? 99) : 99;
                    const bSort = typeof b[1] === 'object' && b[1] !== null ? ((b[1] as Record<string, unknown>).sortKey as number ?? 99) : 99;
                    return aSort - bSort;
                });
                let idx = 0;
                for (const [code, val] of sorted) {
                    let label: string;
                    let cls = '';
                    if (typeof val === 'string') {
                        label = translateLabel(val);
                    } else if (val && typeof val === 'object') {
                        const v = val as Record<string, string>;
                        const rawName = v.name || v.label || v.title || '';
                        label = rawName ? translateLabel(rawName) : `Status ${code}`;
                        cls = v.class || v.className || v.color || '';
                    } else {
                        label = `Status ${code}`;
                    }
                    console.log(`[STATUS-DEBUG] code=${code}, val=`, JSON.stringify(val), `→ label="${label}", cls="${cls}"`);
                    list.push({ v: String(code), l: label, c: guessColor(cls, idx) });
                    idx++;
                }
            } else {
                (raw as Record<string, unknown>[]).forEach((item, i) => {
                    const code = item.key || item.code || item.id || item.value || String(i);
                    const rawName = (item.name || item.label || item.title || '') as string;
                    const label = rawName ? translateLabel(rawName) : 'Status';
                    const cls = (item.class || item.className || item.color || '') as string;
                    console.log(`[STATUS-DEBUG] array item ${i}:`, JSON.stringify(item), `→ code=${code}, label="${label}"`);
                    list.push({ v: String(code), l: label, c: guessColor(cls, i) });
                });
            }
            // Odfiltruj statusy ukryte w LeanMobile (np. Zarchiwizowane)
            const visible = list.filter(s => !HIDDEN_STATUSES.has(s.v));
            console.log('[STATUS-DEBUG] final list:', JSON.stringify(visible));
            if (visible.length) return visible;
        }
    } catch (e) {
        console.error('[STATUS-DEBUG] apiGetStatusLabels FAILED:', e);
    }
    console.warn('[STATUS-DEBUG] Using FALLBACK_STATUS_LIST');
    return FALLBACK_STATUS_LIST;
}

// ─── TASKS ───────────────────────────────────────────────────

export async function apiGetAllTasks(): Promise<LtTask[]> {
    let result: LtTask[] = [];

    // Próba 1: dedykowana metoda "moje zadania" (Leantime 3.x)
    try {
        const d = await rpc('leantime.rpc.tickets.getAll', { searchCriteria: { userId: 'current', currentProject: '' } });
        const arr = toArr<LtTask>(d);
        if (arr.length > 0) { result = arr; }
    } catch { /* próbuj dalej */ }

    if (!result.length) {
        // Próba 2: getAllMyTickets / getMyTickets
        try {
            const d = await rpc('leantime.rpc.tickets.getMyTickets', {});
            const arr = toArr<LtTask>(d);
            if (arr.length > 0) { result = arr; }
        } catch { /* próbuj dalej */ }
    }

    if (!result.length) {
        // Próba 3: getAll z pustym currentProject (pobiera wszystkie projekty)
        try {
            const d = await rpc('leantime.rpc.tickets.getAll', { searchCriteria: { currentProject: '' } });
            const arr = toArr<LtTask>(d);
            if (arr.length > 0) { result = arr; }
        } catch { /* próbuj dalej */ }
    }

    if (!result.length) {
        // Próba 4: getAllBySearchCriteria
        try {
            const d = await rpc('leantime.rpc.tickets.getAllBySearchCriteria', { searchCriteria: {} });
            const arr = toArr<LtTask>(d);
            if (arr.length > 0) { result = arr; }
        } catch { /* próbuj dalej */ }
    }

    if (!result.length) {
        // Próba 5: getAll z {} (ostateczny fallback)
        const d = await rpc('leantime.rpc.tickets.getAll', {});
        result = toArr<LtTask>(d);
    }

    // Filtruj milestony i zarchiwizowane zadania
    return result.filter(t => t.type !== 'milestone' && !HIDDEN_STATUSES.has(String(t.status)));
}

export async function apiGetProjectTasks(projectId: string | number): Promise<LtTask[]> {
    let arr: LtTask[];
    try {
        const d = await rpc('leantime.rpc.tickets.getAll', { searchCriteria: { currentProject: projectId } });
        arr = toArr<LtTask>(d);
    } catch {
        const d = await rpc('leantime.rpc.tickets.getAll', { projectId });
        arr = toArr<LtTask>(d);
    }
    // Filtruj milestony i zarchiwizowane zadania
    const filtered = arr.filter(t => t.type !== 'milestone' && !HIDDEN_STATUSES.has(String(t.status)));
    console.log(`[TASKS-DEBUG] Project ${projectId}: ${arr.length} total, ${filtered.length} after filtering. Status values:`,
        filtered.map(t => ({ id: t.id, headline: t.headline?.substring(0, 40), status: t.status, type: t.type })));
    return filtered;
}

export async function apiGetMilestones(projectId: string | number): Promise<LtMilestone[]> {
    const d = await rpc('leantime.rpc.tickets.getAllMilestones', {
        searchCriteria: { currentProject: projectId },
    });
    return toArr<LtMilestone>(d).filter((m) => m.type === 'milestone');
}

export async function apiAddTask(values: Record<string, unknown>): Promise<unknown> {
    return rpc('leantime.rpc.tickets.addTicket', { values });
}

export async function apiUpdateTask(id: string | number, values: Record<string, unknown>): Promise<void> {
    await rpc('leantime.rpc.tickets.updateTicket', { values: { id, ...values } });
}

export async function apiChangeStatus(ticketId: string | number, newStatus: string): Promise<void> {
    try {
        await rpc('leantime.rpc.tickets.patch', { id: ticketId, params: { status: newStatus } });
    } catch {
        try {
            await rpc('leantime.rpc.tickets.update', { id: ticketId, values: { status: newStatus } });
        } catch {
            await rpc('leantime.rpc.tickets.updateTicketStatus', { id: ticketId, status: newStatus });
        }
    }
}

export async function apiDeleteTask(id: string | number): Promise<void> {
    try {
        await rpc('leantime.rpc.tickets.deleteTicket', { id });
    } catch {
        await rpc('leantime.rpc.tickets.delete', { id });
    }
}

// ─── PROJECT UPDATES (Comments) ──────────────────────────────

export const PROJECT_UPDATE_COMMENT_TYPE = 2;
export const PROJECT_STATUS_LABEL: Record<number, { l: string; c: string }> = {
    0: { l: 'Na dobrej drodze', c: '#27ae60' },
    1: { l: 'Zagrożony', c: '#f39c12' },
    2: { l: 'Problem', c: '#e74c3c' },
};
export const PROJECT_STATUS_MAP: Record<string, number> = {
    green: 0, yellow: 1, red: 2,
};

// Prefix RPC dla komentarzy (Leantime 3.x)
const COMMENT_RPC = 'leantime.rpc.comments';

async function commentRpc(action: string, params: Record<string, unknown>): Promise<unknown> {
    return rpc(`${COMMENT_RPC}.${action}`, params);
}

export async function apiGetProjectUpdates(projectId: string | number): Promise<LtComment[]> {
    const n = parseInt(String(projectId));
    const pidStr = String(projectId);
    const result = await commentRpc('getComments', { module: 'project', entityId: n });
    const all = toArr<LtComment>(result);
    const updates = all.filter((c) => Number(c.commentType) === PROJECT_UPDATE_COMMENT_TYPE);
    const filtered = (updates.length ? updates : all).filter((c) => {
        if (c.moduleId != null && String(c.moduleId) !== pidStr) return false;
        if (c.entityId != null && String(c.entityId) !== pidStr) return false;
        if (c.projectId != null && String(c.projectId) !== pidStr) return false;
        return true;
    });
    return filtered.sort((a, b) => ((b.date || '') > (a.date || '') ? 1 : -1));
}

export async function apiAddProjectUpdate(
    projectId: string | number,
    projectName: string,
    text: string,
    statusNum: number
): Promise<unknown> {
    const htmlText = `<p>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
    const entityId = parseInt(String(projectId));
    // entity musi być pełnym obiektem z id i name – inaczej Leantime rzuca redirect
    const entity = { id: entityId, name: projectName, projectId: entityId };
    return commentRpc('addComment', {
        values: {
            text: htmlText,
            father: 0,
            status: String(statusNum),
            commentType: PROJECT_UPDATE_COMMENT_TYPE,
            date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        },
        module: 'project',
        entityId: entityId,
        entity,
    });
}

export async function apiEditProjectUpdate(commentId: string | number, text: string): Promise<void> {
    const htmlText = `<p>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
    await commentRpc('editComment', { values: { text: htmlText }, id: commentId });
}

export async function apiDeleteProjectUpdate(commentId: string | number): Promise<void> {
    await commentRpc('deleteComment', { commentId });
}
