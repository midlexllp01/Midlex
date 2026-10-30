"use client";
import Brand from "./Brand";
import WorkspaceChat from "./WorkspaceChat";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  Building2,
  Check,
  ChevronRight,
  Code2,
  ExternalLink,
  FolderOpen,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
} from "lucide-react";
type Access = "ADMIN" | "USER";
type Grant = Access | "BOTH";
type Person = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  mustChangePassword: boolean;
  grants: Record<string, Grant>;
};
type Project = {
  id: string;
  name: string;
  description: string;
  category: string;
  access: Grant;
};
type ProfileOption = { project: Project; access: Access; label: string };
type Data = {
  user: Person;
  projects: Project[];
  users?: Person[];
  audit?: {
    id: string;
    actorId: string;
    action: string;
    target: string;
    createdAt: string;
  }[];
};
async function api(path: string, method = "GET", body?: unknown) {
  const response = await fetch(`/api/${path}`, {
    method,
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}
const roleDetails: Record<
  string,
  { title: string; subtitle: string; label: string }
> = {
  developer: {
    title: "Your ecosystem. Under control.",
    subtitle:
      "Bring your people and projects together. You decide who gets access.",
    label: "Developer workspace",
  },
  admin: {
    title: "Everything you need to lead.",
    subtitle:
      "Your assigned projects and administrative tools, connected in one place.",
    label: "Admin workspace",
  },
  staff: {
    title: "A good day starts here.",
    subtitle:
      "Your projects, your tools, and a clear place to get things done.",
    label: "Staff workspace",
  },
};
export default function Workspace({ role }: { role: string }) {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All projects");
  const [editor, setEditor] = useState<Person | "new" | null>(null);
  const [grants, setGrants] = useState<Record<string, Grant>>({});
  const [busy, setBusy] = useState(false);
  const [launching, setLaunching] = useState("");
  const [profileProject, setProfileProject] = useState<Project | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"STAFF" | "ADMIN">("STAFF");
  const load = useCallback(async () => {
    try {
      const next = await api("me");
      const userRole = next.user.role.toLowerCase();
      if (userRole !== role) {
        router.replace(`/${userRole}`);
        return;
      }
      setData({
        ...next,
        projects: next.projects.map((project: Project) =>
          project.id === "cbt" ? { ...project, name: "Midlex CBT" } : project,
        ),
      });
    } catch (e) {
      router.replace(`/login?role=${role}`);
    }
  }, [role, router]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const refresh = () => {
      void load();
    };
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, [load]);
  if (!data)
    return (
      <main className="loading">
        {error ? (
          <>
            <p role="alert">{error}</p>
            <a href="/login">Return to sign in</a>
            <button
              onClick={() => {
                setError("");
                void load();
              }}
            >
              Retry
            </button>
          </>
        ) : (
          "Preparing your workspace…"
        )}
      </main>
    );
  const developer = data.user.role === "DEVELOPER";
  const canManageUsers = developer || data.user.role === "ADMIN";
  const details = roleDetails[role];
  const people = data.users || [];
  const projects = data.projects.filter(
    (p) =>
      `${p.name} ${p.description}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (category === "All projects" || category === p.category),
  );
  const availableProfiles: ProfileOption[] = [];
  const addProfiles = (
    project: Project,
    adminLabel: string,
    userLabel: string,
  ) => {
    if (project.access !== "USER")
      availableProfiles.push({ project, access: "ADMIN", label: adminLabel });
    if (project.access !== "ADMIN" && project.id !== "legal-admin")
      availableProfiles.push({ project, access: "USER", label: userLabel });
  };
  if (profileProject) {
    addProfiles(
      profileProject,
      "Admin profile",
      profileProject.id === "legal-staff" ? "Lawyer profile" : "User profile",
    );
    if (profileProject.id === "legal-admin") {
      const counsel = data.projects.find((p) => p.id === "legal-staff");
      const finance = data.projects.find((p) => p.id === "finance");
      if (counsel)
        addProfiles(counsel, "Counsel admin profile", "Lawyer profile");
      if (finance)
        addProfiles(finance, "Finance admin profile", "Finance user profile");
    }
  }
  const shownPeople = people.filter((u) =>
    `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase()),
  );
  const needsPassword = data.user.mustChangePassword || passwordOpen;
  async function launch(project: Project, access: Access) {
    const appMode =
      new URLSearchParams(window.location.search).get("midlexApp") === "1";
    const newTab = appMode ? null : window.open("about:blank", "_blank");
    if (!appMode && !newTab) {
      setError("Allow pop-ups for this workspace to open your project in a new tab.");
      return;
    }
    if (newTab) {
      newTab.opener = null;
      newTab.document.title = "Opening Midlex project";
      newTab.document.body.textContent = "Preparing your secure project session…";
    }
    setLaunching(project.id);
    setError("");
    try {
      const result = await api(`launch/${project.id}`, "POST", {
        access,
        returnUrl: window.location.origin,
      });
      if (appMode) window.location.assign(result.url);
      else newTab!.location.replace(result.url);
      setProfileProject(null);
    } catch (e) {
      newTab?.close();
      setError(e instanceof Error ? e.message : "Unable to open project");
    } finally {
      setLaunching("");
    }
  }
  async function toggleRolePrivileges(person: Person) {
    if (!data) return;
    const nextRole = person.role === "ADMIN" ? "STAFF" : "ADMIN";
    const isToAdmin = nextRole === "ADMIN";
    const promptText = isToAdmin
      ? `Promote "${person.name}" to ADMIN?\n\nThis will switch their workspace role to ADMIN and grant full Admin privileges across all Midlex projects.`
      : `Switch "${person.name}" to STAFF?\n\nThis will switch their workspace role to STAFF and apply standard Staff privileges.`;

    if (!confirm(promptText)) return;

    setBusy(true);
    setError("");
    try {
      const nextGrants: Record<string, Access> = {};
      if (isToAdmin) {
        data.projects.forEach((p) => {
          nextGrants[p.id] = "ADMIN";
        });
      } else {
        data.projects.forEach((p) => {
          if (["legal-staff", "cbt", "hrms", "ai", "mip"].includes(p.id)) {
            nextGrants[p.id] = "USER";
          }
        });
      }

      await api(`users/${person.id}`, "PATCH", {
        role: nextRole,
        grants: nextGrants,
      });

      setNotice(
        `${person.name} has been switched to ${nextRole} with full ${nextRole.toLowerCase()} privileges updated.`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to change privileges");
    } finally {
      setBusy(false);
    }
  }
  async function deleteUser(person: Person) {
    if (
      !confirm(
        `Are you sure you want to permanently delete user "${person.name}" (${person.email})?`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api(`users/${person.id}`, "DELETE", {});
      setNotice(`User "${person.name}" has been deleted.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete user");
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      if (editor && editor !== "new") {
        await api(`users/${editor.id}`, "PATCH", {
          name: form.get("name"),
          email: form.get("email"),
          ...(form.get("password") ? { password: form.get("password") } : {}),
          role: selectedRole,
          active: form.get("active") !== "false",
          grants,
        });
        setEditor(null);
        setNotice("Details updated successfully.");
        await load();
      } else {
        await api("users", "POST", {
          name: form.get("name"),
          email: form.get("email"),
          ...(form.get("password") ? { password: form.get("password") } : {}),
          role: selectedRole,
          active: form.get("active") !== "false",
          grants,
        });
        setEditor(null);
        setNotice(
          "Account created. Share the temporary password securely with this person.",
        );
        await load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  }
  async function password(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirm")) {
      setError("The new passwords do not match");
      setBusy(false);
      return;
    }
    try {
      await api("password", "POST", {
        currentPassword: form.get("currentPassword"),
        password: form.get("password"),
      });
      setPasswordOpen(false);
      setNotice("Password changed. Your previous sessions have been revoked.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update password");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await api("logout", "POST", {});
      router.replace(`/login?role=${role}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign out");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={`shell ${role}`}>
      <aside className="sidebar">
        <div className="sidebar-header-row">
          <Brand role={role} />
          <div className="workspace-label">
            {developer ? (
              <Code2 size={15} />
            ) : role === "staff" ? (
              <Users size={15} />
            ) : (
              <ShieldCheck size={15} />
            )}{" "}
            {details.label}
          </div>
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {[
            { id: "overview", name: "Overview", icon: LayoutDashboard },
            { id: "projects", name: "My projects", icon: FolderOpen },
            ...(canManageUsers
              ? [{ id: "people", name: "People & access", icon: Users }]
              : []),
            ...(developer
              ? [{ id: "activity", name: "Activity log", icon: Activity }]
              : []),
          ].map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? "selected" : ""}
              onClick={() => {
                setTab(item.id);
                setSearch("");
                setCategory("All projects");
              }}
            >
              <item.icon size={18} />
              {item.name}
              {item.id === "projects" && <span>{data.projects.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="secure-note">
            <ShieldCheck size={21} />
            <strong>One sign-in. Connected access.</strong>
            <p>Your permissions follow you across the Midlex ecosystem.</p>
          </div>
          <button
            className="profile"
            onClick={() => setPasswordOpen(true)}
            title="Change password"
          >
            <span className="avatar">
              {data.user.name.slice(0, 2).toUpperCase()}
            </span>
            <span>
              <strong>{data.user.name}</strong>
              <small>{data.user.role.toLowerCase()}</small>
            </span>
            <SlidersHorizontal size={16} />
          </button>
          <button className="logout" disabled={busy} onClick={logout}>
            <LogOut size={16} /> Sign out everywhere
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div>
            Workspace <ChevronRight size={14} />
            <strong>
              {tab === "people"
                ? "People & access"
                : tab === "activity"
                  ? "Activity log"
                  : tab === "projects"
                    ? "My projects"
                    : "Overview"}
            </strong>
          </div>
          <span className="security-status">
            <span />
            Secure session
          </span>
          <button
            className="secondary compact"
            onClick={() => {
              setError("");
              setPasswordOpen(true);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.8125rem",
              padding: "6px 12px",
              cursor: "pointer",
              marginLeft: "auto",
            }}
          >
            <LockKeyhole size={14} /> Change password
          </button>
          <WorkspaceChat canManage={canManageUsers} currentUserId={data.user.id} />
          <div className="mobile-account">
            <button
              aria-label="Change password"
              onClick={() => setPasswordOpen(true)}
            >
              <LockKeyhole size={16} />
            </button>
            <button
              aria-label="Sign out everywhere"
              disabled={busy}
              onClick={logout}
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <main className="content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {new Intl.DateTimeFormat("en-GB", {
                  dateStyle: "full",
                  timeZone: "Africa/Lagos",
                }).format(new Date())}
              </span>
              <h1>
                {tab === "overview"
                  ? `Good day, ${data.user.name}`
                  : tab === "people"
                    ? "The right access. For every person."
                    : tab === "activity"
                      ? "A record of what matters."
                      : details.title}
              </h1>
              <p>
                {tab === "people"
                  ? "Onboard your team and set permissions for each project independently."
                  : tab === "activity"
                    ? "Sign-ins, onboarding and permission changes across your workspace."
                    : details.subtitle}
              </p>
            </div>
            {canManageUsers && (
              <button
                className="primary compact"
                onClick={() => {
                  setEditor("new");
                  setSelectedRole("STAFF");
                  setGrants({});
                  setError("");
                }}
              >
                <Plus size={17} /> Onboard person
              </button>
            )}
          </div>
          {error && !editor && !needsPassword && (
            <div className="notice error" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="notice success" role="status">
              <Check size={17} />
              {notice}
              <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {tab === "overview" && (
            <>
              <div className="welcome-banner">
                <div>
                  <span className="eyebrow">
                    {developer
                      ? "ECOSYSTEM CONTROL CENTRE"
                      : `WELCOME BACK, ${data.user.name}`}
                  </span>
                  <h2>
                    {developer
                      ? "Build a more connected Midlex."
                      : "Your next step is one click away."}
                  </h2>
                  <p>
                    {developer
                      ? "Give every person a workspace that is built around their work."
                      : "Open any assigned project below. Your workspace signs you in automatically."}
                  </p>
                  <button
                    onClick={() => setTab(developer ? "people" : "projects")}
                  >
                    {developer
                      ? "Manage people & access"
                      : "Explore my projects"}
                    <ArrowUpRight size={17} />
                  </button>
                </div>
                <div className="orbit-art" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <Building2 size={46} />
                </div>
              </div>
              <div className="stats">
                <div>
                  <span>
                    <FolderOpen size={19} />{" "}
                    {developer ? "Connected projects" : "Assigned projects"}
                  </span>
                  <strong>
                    {data.projects.length.toString().padStart(2, "0")}
                  </strong>
                  <small>
                    {developer
                      ? "Across the Midlex ecosystem"
                      : "Ready to open in a new tab"}
                  </small>
                </div>
                <div>
                  <span>
                    <Users size={19} />{" "}
                    {developer ? "Team members" : "Project admin access"}
                  </span>
                  <strong>
                    {(developer
                      ? people.filter((p) => p.role !== "DEVELOPER").length
                      : data.projects.filter((p) => p.access !== "USER").length
                    )
                      .toString()
                      .padStart(2, "0")}
                  </strong>
                  <small>
                    {developer
                      ? `${people.filter((p) => p.active).length} active accounts, including you`
                      : "Assigned by your developer"}
                  </small>
                </div>
                <div>
                  <span>
                    <ShieldCheck size={19} />{" "}
                    {developer ? "Workspace admins" : "Project user access"}
                  </span>
                  <strong>
                    {(developer
                      ? people.filter((p) => p.role === "ADMIN").length
                      : data.projects.filter((p) => p.access !== "ADMIN").length
                    )
                      .toString()
                      .padStart(2, "0")}
                  </strong>
                  <small>
                    {developer
                      ? "Project permissions set individually"
                      : "Access tailored to your work"}
                  </small>
                </div>
              </div>
            </>
          )}
          {["overview", "projects"].includes(tab) && (
            <section className="project-section">
              <div className="section-heading">
                <div>
                  <h2>
                    {developer ? "Your connected projects" : "Your projects"}
                    <span className="count">{data.projects.length}</span>
                  </h2>
                  <p>
                    Choose a project to continue. Every project opens in a new
                    tab.
                  </p>
                </div>
                <span className="muted">
                  <ExternalLink size={14} /> Single sign-on enabled
                </span>
              </div>
              <div className="toolbar">
                <label className="search">
                  <Search size={18} />
                  <input
                    aria-label="Search projects"
                    placeholder="Find a project…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <select
                  aria-label="Project category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {[
                    "All projects",
                    ...new Set(data.projects.map((p) => p.category)),
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="project-grid">
                {projects.map((project, i) => (
                  <article className="project-card" key={project.id}>
                    <div className="card-top">
                      <div className={`project-icon color-${i % 4}`}>
                        <Building2 size={23} />
                      </div>
                      <span
                        className={`badge ${project.access !== "USER" ? "admin-badge" : ""}`}
                      >
                        {project.access === "BOTH"
                          ? "Admin + user access"
                          : project.access === "ADMIN"
                            ? "Admin access"
                            : "User access"}
                      </span>
                    </div>
                    <span className="project-category">{project.category}</span>
                    <h3>{project.name}</h3>
                    <p>{project.description}</p>
                    <button
                      disabled={launching === project.id || needsPassword}
                      onClick={() => {
                        setError("");
                        setProfileProject(project);
                      }}
                    >
                      {launching === project.id
                        ? "Opening project…"
                        : "Access project"}
                      <ArrowUpRight size={17} />
                    </button>
                  </article>
                ))}
              </div>
              {!projects.length && (
                <div className="empty">
                  <FolderOpen size={32} />
                  <h3>
                    {data.projects.length
                      ? "No matching projects"
                      : "Your workspace is ready for access"}
                  </h3>
                  <p>
                    {data.projects.length
                      ? "Try a different name or category."
                      : "Your developer will assign projects here. You can stay signed in while access is arranged."}
                  </p>
                  <button onClick={() => void load()}>Refresh access</button>
                </div>
              )}
            </section>
          )}
          {tab === "people" && canManageUsers && (
            <section className="panel">
              <div className="toolbar">
                <h2>
                  People <span className="count">{people.length}</span>
                </h2>
                <label className="search">
                  <Search size={18} />
                  <input
                    placeholder="Search people…"
                    aria-label="Search people"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Person</th>
                      <th>Workspace</th>
                      <th>Project access</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownPeople.map((person) => (
                      <tr key={person.id}>
                        <td>
                          <strong>{person.name}</strong>
                          <small>{person.email}</small>
                        </td>
                        <td>
                          <span className="badge">{person.role}</span>
                        </td>
                        <td>
                          {person.role === "DEVELOPER"
                            ? "All projects"
                            : `${Object.keys(person.grants || {}).length} projects`}
                        </td>
                        <td>
                          <span
                            className={`status ${person.active ? "active" : ""}`}
                          >
                            {person.active
                              ? person.mustChangePassword
                                ? "Password setup pending"
                                : "Active"
                              : "Suspended"}
                          </span>
                        </td>
                        <td>
                          {person.role !== "DEVELOPER" && (
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                flexWrap: "wrap",
                              }}
                            >
                              {developer && (
                                <button
                                  className="secondary-button"
                                  style={{
                                    background:
                                      person.role === "ADMIN"
                                        ? "rgba(168, 85, 247, 0.12)"
                                        : "rgba(234, 179, 8, 0.12)",
                                    color:
                                      person.role === "ADMIN"
                                        ? "#c084fc"
                                        : "#eab308",
                                    border: `1px solid ${person.role === "ADMIN" ? "rgba(168, 85, 247, 0.3)" : "rgba(234, 179, 8, 0.3)"}`,
                                    padding: "6px 12px",
                                    borderRadius: "8px",
                                    fontSize: "0.75rem",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                  }}
                                  disabled={busy}
                                  title={
                                    person.role === "ADMIN"
                                      ? "Switch privileges: Demote to Staff"
                                      : "Switch privileges: Promote to Admin with all projects"
                                  }
                                  onClick={() =>
                                    void toggleRolePrivileges(person)
                                  }
                                >
                                  {person.role === "ADMIN" ? (
                                    <Users size={13} />
                                  ) : (
                                    <ShieldCheck size={13} />
                                  )}
                                  {person.role === "ADMIN"
                                    ? "Switch to Staff"
                                    : "Switch to Admin"}
                                </button>
                              )}
                              <button
                                className="secondary-button"
                                style={{
                                  background: "rgba(59, 130, 246, 0.12)",
                                  color: "#3b82f6",
                                  border: "1px solid rgba(59, 130, 246, 0.3)",
                                  padding: "6px 12px",
                                  borderRadius: "8px",
                                  fontSize: "0.75rem",
                                  fontWeight: "700",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                                disabled={busy}
                                onClick={() => {
                                  setEditor(person);
                                  setSelectedRole(
                                    (person.role as "STAFF" | "ADMIN") ||
                                      "STAFF",
                                  );
                                  setGrants({ ...(person.grants || {}) });
                                  setError("");
                                }}
                              >
                                <Pencil size={13} /> Edit
                              </button>
                              {person.id !== data.user.id && (
                                <button
                                  className="danger-button"
                                  style={{
                                    background: "rgba(239, 68, 68, 0.12)",
                                    color: "#ef4444",
                                    border: "1px solid rgba(239, 68, 68, 0.3)",
                                    padding: "6px 12px",
                                    borderRadius: "8px",
                                    fontSize: "0.75rem",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                  disabled={busy}
                                  onClick={() => void deleteUser(person)}
                                >
                                  <Trash2 size={13} /> Delete user
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!shownPeople.length && (
                <div className="empty">No people match your search.</div>
              )}
            </section>
          )}
          {tab === "activity" && developer && (
            <section className="panel">
              <h2 className="panel-heading">Recent activity</h2>
              {data.audit?.map((item) => (
                <div className="activity-row" key={item.id}>
                  <span className="activity-icon">
                    <Activity size={17} />
                  </span>
                  <div>
                    <strong>
                      {item.action.replaceAll("_", " ").toLowerCase()}
                    </strong>
                    <p>
                      {people.find((p) => p.id === item.actorId)?.name ||
                        "Workspace member"}{" "}
                      ·{" "}
                      {people.find((p) => p.id === item.target)?.name ||
                        item.target}
                    </p>
                  </div>
                  <time>
                    {new Date(item.createdAt).toLocaleString("en-GB", {
                      timeZone: "Africa/Lagos",
                    })}
                  </time>
                </div>
              ))}
              {!data.audit?.length && (
                <div className="empty">
                  Activity will appear here as people use the workspace.
                </div>
              )}
            </section>
          )}
          <footer className="content-footer">
            <span>© {new Date().getFullYear()} Midlex LLP</span>
            <span>
              <LockKeyhole size={13} /> Your access is managed by your workspace
              developer.
            </span>
          </footer>
        </main>
      </div>
      {profileProject && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-title"
          >
            <header>
              <div>
                <span className="eyebrow">CHOOSE YOUR PROFILE</span>
                <h2 id="profile-title">Open {profileProject.name}</h2>
              </div>
              <button
                aria-label="Close profile chooser"
                onClick={() => setProfileProject(null)}
              >
                <X size={21} />
              </button>
            </header>
            <p className="muted">
              Choose the workspace profile you want to use. Only profiles
              assigned to you are shown.
            </p>
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            <div className="grant-list">
              {availableProfiles.map((choice) => (
                <button
                  key={`${choice.project.id}-${choice.access}`}
                  type="button"
                  className="grant-row profile-choice"
                  disabled={!!launching}
                  onClick={() => void launch(choice.project, choice.access)}
                >
                  <span>
                    <strong>{choice.label}</strong>
                    <small>{choice.project.name}</small>
                  </span>
                  <ArrowUpRight size={17} />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
      {editor && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="person-title"
          >
            <header>
              <div>
                <span className="eyebrow">
                  {developer ? "DEVELOPER CONTROLS" : "ADMIN CONTROLS"}
                </span>
                <h2 id="person-title">
                  {editor === "new"
                    ? "Welcome someone to Midlex"
                    : `Edit details for ${editor.name}`}
                </h2>
              </div>
              <button aria-label="Close" onClick={() => setEditor(null)}>
                <X size={21} />
              </button>
            </header>
            <form onSubmit={save}>
              {error && (
                <div className="notice error" role="alert">
                  {error}
                </div>
              )}
              <label>
                Full name
                <input
                  autoFocus
                  name="name"
                  required
                  defaultValue={editor !== "new" ? editor.name : ""}
                  placeholder="Full name"
                />
              </label>
              <label>
                Work email
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={editor !== "new" ? editor.email : ""}
                  placeholder="name@midlex.com"
                />
              </label>
              <label>
                {editor === "new"
                  ? "Temporary password"
                  : "New password (optional)"}
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  required={editor === "new"}
                  placeholder={
                    editor !== "new" ? "Leave blank to preserve password" : ""
                  }
                />
                <small>
                  {editor === "new"
                    ? "At least 6 characters. They will choose a new password on first sign-in."
                    : "Enter at least 12 characters only if you wish to reset their password."}
                </small>
              </label>
              <div className="form-row">
                <label>
                  Workspace role
                  <select
                    name="role"
                    value={selectedRole}
                    onChange={(e) => {
                      const nextRole = e.target.value as "STAFF" | "ADMIN";
                      setSelectedRole(nextRole);
                      if (nextRole === "ADMIN") {
                        const next: Record<string, Access> = {};
                        data.projects.forEach((p) => {
                          next[p.id] = "ADMIN";
                        });
                        setGrants(next);
                      } else {
                        const next: Record<string, Access> = {};
                        data.projects.forEach((p) => {
                          if (
                            [
                              "legal-staff",
                              "cbt",
                              "hrms",
                              "ai",
                              "mip",
                            ].includes(p.id)
                          )
                            next[p.id] = "USER";
                        });
                        setGrants(next);
                      }
                    }}
                  >
                    <option value="STAFF">Staff (Staff Workspace)</option>
                    <option value="ADMIN">
                      Admin (Full Administrative Privileges)
                    </option>
                  </select>
                </label>
                <label>
                  Account status
                  <select
                    name="active"
                    defaultValue={
                      editor !== "new" ? String(editor.active) : "true"
                    }
                  >
                    <option value="true">Active</option>
                    <option value="false">Suspended</option>
                  </select>
                </label>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: "16px",
                  marginBottom: "8px",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div>
                  <h3 style={{ margin: 0 }}>Project permissions</h3>
                  <p
                    className="muted"
                    style={{ margin: 0, fontSize: "0.8rem" }}
                  >
                    Set project privileges individually or use 1-click presets:
                  </p>
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="secondary-button"
                    style={{
                      padding: "5px 10px",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      background: "rgba(234, 179, 8, 0.12)",
                      color: "#eab308",
                      border: "1px solid rgba(234, 179, 8, 0.3)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    onClick={() => {
                      setSelectedRole("ADMIN");
                      const next: Record<string, Access> = {};
                      data.projects.forEach((p) => {
                        next[p.id] = "ADMIN";
                      });
                      setGrants(next);
                    }}
                  >
                    <ShieldCheck size={12} /> Grant all Admin privileges
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    style={{
                      padding: "5px 10px",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      background: "rgba(59, 130, 246, 0.12)",
                      color: "#3b82f6",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    onClick={() => {
                      setSelectedRole("STAFF");
                      const next: Record<string, Access> = {};
                      data.projects.forEach((p) => {
                        next[p.id] = "USER";
                      });
                      setGrants(next);
                    }}
                  >
                    <Users size={12} /> Grant all Staff privileges
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    style={{
                      padding: "5px 10px",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: "rgba(255, 255, 255, 0.05)",
                      color: "#94a3b8",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      cursor: "pointer",
                    }}
                    onClick={() => setGrants({})}
                  >
                    Clear all
                  </button>
                </div>
              </div>
              <div className="grant-list">
                {data.projects.map((project) => (
                  <label className="grant-row" key={project.id}>
                    <span>{project.name}</span>
                    <select
                      aria-label={`${project.name} access`}
                      value={grants[project.id] || ""}
                      onChange={(e) => {
                        const next = { ...grants };
                        if (e.target.value)
                          next[project.id] = e.target.value as Grant;
                        else delete next[project.id];
                        setGrants(next);
                      }}
                    >
                      <option value="">No access</option>
                      {project.id !== "legal-admin" && (
                        <option value="USER">User</option>
                      )}
                      <option value="ADMIN">Admin</option>
                      {project.id !== "legal-admin" && (
                        <option value="BOTH">Admin + user</option>
                      )}
                    </select>
                  </label>
                ))}
              </div>
              <footer className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setEditor(null)}
                >
                  Cancel
                </button>
                <button className="primary compact" disabled={busy}>
                  {busy
                    ? "Saving…"
                    : editor === "new"
                      ? "Create account"
                      : "Save changes"}
                  <Check size={16} />
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {needsPassword && (
        <div className="modal-backdrop">
          <section
            className="modal password-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-title"
          >
            <header>
              <div>
                <span className="eyebrow">ACCOUNT SECURITY</span>
                <h2 id="password-title">
                  {data.user.mustChangePassword
                    ? "Make this account yours"
                    : "Change your password"}
                </h2>
              </div>
              {!data.user.mustChangePassword && (
                <button
                  aria-label="Close"
                  onClick={() => setPasswordOpen(false)}
                >
                  <X size={20} />
                </button>
              )}
            </header>
            <p>Choose a password of at least 12 characters to continue.</p>
            <form onSubmit={password}>
              {error && (
                <div className="notice error" role="alert">
                  {error}
                </div>
              )}
              <label>
                Current or temporary password
                <input
                  autoFocus
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <label>
                New password
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  required
                />
              </label>
              <label>
                Confirm new password
                <input
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  required
                />
              </label>
              <button className="primary" disabled={busy}>
                {busy ? "Updating…" : "Set password and continue"}
                <ArrowUpRight size={17} />
              </button>
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={logout}
              >
                Sign out
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
