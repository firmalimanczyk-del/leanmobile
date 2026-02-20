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
        // Wołamy lokalne proxy /api/jsonrpc (same origin — brak CORS)
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
        if (!r.ok) {
            const t = await r.text();
            throw new Error(`HTTP ${r.status}: ${t}`);
        }
        const d = await r.json();
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

export const FALLBACK_STATUS_LIST: LtStatusLabel[] = [
    { v: '3', l: 'Nowe', c: '#2563EB' },
    { v: '1', l: 'Zablokowane', c: '#DC3545' },
    { v: '4', l: 'W toku', c: '#F59E0B' },
    { v: '2', l: 'Oczekuje na akceptację', c: '#F5A623' },
    { v: '0', l: 'Zrobione', c: '#28A745' },
    { v: '5', l: 'Zarchiwizowane', c: '#6B7280' },
];

export const DONE_STATUSES = new Set(['0', '5']);

export async function apiGetStatusLabels(): Promise<LtStatusLabel[]> {
    try {
        const raw = await rpc('leantime.rpc.tickets.getStatusLabels');
        if (raw && typeof raw === 'object') {
            const list: LtStatusLabel[] = [];
            if (!Array.isArray(raw)) {
                let idx = 0;
                for (const [code, val] of Object.entries(raw as Record<string, unknown>)) {
                    const v = val as Record<string, string>;
                    const label = typeof val === 'string' ? val : (v.name || v.label || v.title || `Status ${code}`);
                    const cls = typeof val === 'object' ? (v.class || v.className || v.color || '') : '';
                    list.push({ v: String(code), l: label, c: guessColor(cls, idx) });
                    idx++;
                }
            } else {
                (raw as Record<string, unknown>[]).forEach((item, i) => {
                    const code = item.key || item.code || item.id || item.value || String(i);
                    const label = (item.name || item.label || item.title || 'Status') as string;
                    const cls = (item.class || item.className || item.color || '') as string;
                    list.push({ v: String(code), l: label, c: guessColor(cls, i) });
                });
            }
            if (list.length) return list;
        }
    } catch { /* fallback */ }
    return FALLBACK_STATUS_LIST;
}

// ─── TASKS ───────────────────────────────────────────────────

export async function apiGetAllTasks(): Promise<LtTask[]> {
    // Próba 1: dedykowana metoda "moje zadania" (Leantime 3.x)
    try {
        const d = await rpc('leantime.rpc.tickets.getAll', { searchCriteria: { userId: 'current', currentProject: '' } });
        const arr = toArr<LtTask>(d);
        if (arr.length > 0) return arr;
    } catch { /* próbuj dalej */ }

    // Próba 2: getAllMyTickets / getMyTickets
    try {
        const d = await rpc('leantime.rpc.tickets.getMyTickets', {});
        const arr = toArr<LtTask>(d);
        if (arr.length > 0) return arr;
    } catch { /* próbuj dalej */ }

    // Próba 3: getAll z pustym currentProject (pobiera wszystkie projekty)
    try {
        const d = await rpc('leantime.rpc.tickets.getAll', { searchCriteria: { currentProject: '' } });
        const arr = toArr<LtTask>(d);
        if (arr.length > 0) return arr;
    } catch { /* próbuj dalej */ }

    // Próba 4: getAllBySearchCriteria
    try {
        const d = await rpc('leantime.rpc.tickets.getAllBySearchCriteria', { searchCriteria: {} });
        const arr = toArr<LtTask>(d);
        if (arr.length > 0) return arr;
    } catch { /* próbuj dalej */ }

    // Próba 5: getAll z {} (ostateczny fallback)
    const d = await rpc('leantime.rpc.tickets.getAll', {});
    return toArr<LtTask>(d);
}

export async function apiGetProjectTasks(projectId: string | number): Promise<LtTask[]> {
    try {
        const d = await rpc('leantime.rpc.tickets.getAll', { searchCriteria: { currentProject: projectId } });
        return toArr<LtTask>(d);
    } catch {
        const d = await rpc('leantime.rpc.tickets.getAll', { projectId });
        return toArr<LtTask>(d);
    }
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

// Dwa możliwe prefxy RPC dla komentarzy
const COMMENT_PREFIXES = ['leantime.rpc.comments', 'leantime.rpc.Comments.Comments'];
let latchedPrefix = '';

async function commentRpc(action: string, params: Record<string, unknown>): Promise<unknown> {
    const prefixes = latchedPrefix ? [latchedPrefix] : COMMENT_PREFIXES;
    let lastErr: Error = new Error('Unknown error');
    for (const pfx of prefixes) {
        try {
            const result = await rpc(`${pfx}.${action}`, params);
            if (!latchedPrefix) latchedPrefix = pfx;
            return result;
        } catch (e) {
            lastErr = e as Error;
            if (lastErr.message?.includes('500')) throw lastErr;
            if (latchedPrefix && prefixes.length === 1) {
                latchedPrefix = '';
                return commentRpc(action, params);
            }
        }
    }
    throw lastErr;
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
    return commentRpc('addComment', {
        values: {
            text: htmlText,
            father: 0,
            status: String(statusNum),
            commentType: PROJECT_UPDATE_COMMENT_TYPE,
        },
        module: 'project',
        entityId: projectId,
        entity: { name: projectName, id: projectId },
    });
}

export async function apiEditProjectUpdate(commentId: string | number, text: string): Promise<void> {
    const htmlText = `<p>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
    await commentRpc('editComment', { values: { text: htmlText }, id: commentId });
}

export async function apiDeleteProjectUpdate(commentId: string | number): Promise<void> {
    await commentRpc('deleteComment', { commentId });
}
