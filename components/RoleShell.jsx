"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Avatar,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import Badge from "@mui/material/Badge";
import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import PersonIcon from "@mui/icons-material/Person";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn";
import GroupIcon from "@mui/icons-material/Group";
import LogoutIcon from "@mui/icons-material/Logout";
import { useRole } from "./RoleProvider";
import { usePathname } from "next/navigation";

const drawerWidth = 264;
const collapsedDrawerWidth = 76;

const navigation = [
  { label: "Dashboard", href: "/", icon: HomeIcon },
  { label: "Book catalogue", href: "/books", icon: LibraryBooksIcon },
];

const studentNavigation = [
  { label: "E-books", href: "/ebooks", icon: AutoStoriesIcon },
  { label: "Borrowed Books", href: "/borrowed-books", icon: AssignmentReturnIcon },
  { label: "Requested Books", href: "/requested-books", icon: LibraryBooksIcon },
  { label: "Book History", href: "/book-history", icon: GroupIcon },
  { label: "Fine Collection", href: "/fines", icon: AssignmentReturnIcon },
  { label: "Profile", href: "/profile", icon: PersonIcon },
];

const librarianNavigation = [
  { label: "E-books", href: "/ebooks", icon: AutoStoriesIcon },
  { label: "Book Requests", href: "/requests", icon: LibraryBooksIcon },
  { label: "Borrowed Books", href: "/borrowed-books", icon: AssignmentReturnIcon },
  { label: "Book History", href: "/book-history", icon: GroupIcon },
  { label: "Borrowers", href: "/borrowers", icon: PersonIcon },
  { label: "Reports", href: "/reports", icon: AssessmentIcon },
  { label: "Fine Collection", href: "/fines", icon: AssignmentReturnIcon },
  { label: "Profile", href: "/profile", icon: PersonIcon },
];

const adminNavigation = [
  ...librarianNavigation,
];

export function RoleShell({ children }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { role, user, logout } = useRole();
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const router = useRouter();
  const roleNavigation = role === "Student"
    ? studentNavigation
    : role === "Librarian"
      ? librarianNavigation
      : role === "Administrator"
        ? adminNavigation
        : [];
  const activeNavigation = [...navigation, ...roleNavigation].find((item) => (
    item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`)
  ));
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    setDrawerOpen(!isMobile);
  }, [isMobile]);

  const content = useMemo(() => children, [children]);

  useEffect(() => {
    if (!user?.email) return;
    let active = true;
    const load = async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      if (active) setNotifications(data);
    };
    load();
    const interval = window.setInterval(load, 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [user]);

  const markRead = async (n) => {
    if (n.read) return;
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...n, read: true }),
    });
    setNotifications((prev) =>
      prev.map((p) => (p.id === n.id ? { ...p, read: true } : p)),
    );
  };

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          ml: isMobile ? 0 : `${drawerOpen ? drawerWidth : collapsedDrawerWidth}px`,
          width: isMobile ? "100%" : `calc(100% - ${drawerOpen ? drawerWidth : collapsedDrawerWidth}px)`,
          bgcolor: "rgba(255,255,255,0.96)",
          color: "#18332d",
          borderBottom: "1px solid #e5ece8",
          boxShadow: "0 2px 10px rgba(22, 45, 38, 0.04)",
          backdropFilter: "blur(12px)",
          transition: theme.transitions.create(["margin", "width"], { duration: theme.transitions.duration.standard }),
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 64, sm: 72 }, px: { xs: 1.5, md: 3 }, gap: 1.5 }}>
          <Tooltip title={drawerOpen ? "Collapse navigation" : "Expand navigation"}>
            <IconButton
              aria-label={drawerOpen ? "Collapse navigation" : "Expand navigation"}
              onClick={() => setDrawerOpen((prev) => !prev)}
              sx={{ color: "#35564d", border: "1px solid #e1e9e5", borderRadius: 2, width: 40, height: 40 }}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap fontWeight={700} sx={{ lineHeight: 1.25 }}>
              {activeNavigation?.label || "Library workspace"}
            </Typography>
            <Typography variant="caption" noWrap color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
              Pratap College Library
            </Typography>
          </Box>
          <Stack direction="row" spacing={{ xs: 0.75, sm: 1.25 }} alignItems="center">
            {user ? (
              <Tooltip title="Notifications">
                <IconButton aria-label="Open notifications" onClick={() => setNotifOpen(true)} sx={{ color: "#35564d", width: 40, height: 40 }}>
                <Badge
                  badgeContent={unreadCount}
                  color="error"
                  max={99}
                >
                  <NotificationsIcon />
                </Badge>
                </IconButton>
              </Tooltip>
            ) : null}
            {user ? (
              <>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ display: { xs: "none", sm: "flex" }, pl: 1.25, borderLeft: "1px solid #e5ece8" }}>
                  <Avatar sx={{ width: 34, height: 34, bgcolor: "#d9eee3", color: "#1f5b49", fontSize: 13, fontWeight: 700 }}>
                    {(user.name || user.email || "U").split(/[ @]/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0, maxWidth: 180 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>{user.name || user.email}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>{role}</Typography>
                  </Box>
                </Stack>
                <Tooltip title="Sign out">
                  <IconButton
                    aria-label="Sign out"
                    onClick={() => {
                      fetch('/api/auth', { method: 'DELETE' });
                      logout();
                      router.push("/login");
                    }}
                    sx={{ color: "#526b63", width: 40, height: 40 }}
                  >
                    <LogoutIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            ) : null}
          </Stack>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? "temporary" : "persistent"}
        open={isMobile ? drawerOpen : true}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: isMobile ? "min(86vw, 320px)" : drawerOpen ? drawerWidth : collapsedDrawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: isMobile ? "min(86vw, 320px)" : drawerOpen ? drawerWidth : collapsedDrawerWidth,
            boxSizing: "border-box",
            bgcolor: "#142923",
            color: "#f4f8f5",
            borderRight: "1px solid #203b32",
            backgroundImage: "linear-gradient(180deg, #18332b 0%, #11231e 100%)",
            overflowX: "hidden",
            transition: theme.transitions.create(["transform", "width"], { duration: theme.transitions.duration.standard }),
          },
        }}
      >
        <Box sx={{ minHeight: 72, px: drawerOpen || isMobile ? 2.5 : 0, display: "flex", alignItems: "center", justifyContent: drawerOpen || isMobile ? "flex-start" : "center", gap: 1.25, borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
          <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: "#b9e4c9", color: "#173e31", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <LibraryBooksIcon fontSize="small" />
          </Box>
          {drawerOpen || isMobile ? <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={800} noWrap sx={{ letterSpacing: 0.2 }}>PRATAP COLLEGE</Typography>
            <Typography variant="caption" sx={{ color: "#a8c2b6" }} noWrap>Library management</Typography>
          </Box> : null}
        </Box>
        <Box sx={{ px: drawerOpen || isMobile ? 1.5 : 0.75, pt: 2.25, pb: 1, overflowY: "auto", flex: 1 }}>
          {drawerOpen || isMobile ? <Typography variant="overline" sx={{ px: 1.5, color: "#91aa9e", fontSize: 10, fontWeight: 700, letterSpacing: 1.2 }}>
            WORKSPACE
          </Typography> : null}
          <List disablePadding sx={{ mt: 0.75 }}>
            {[...navigation, ...roleNavigation].map((item) => {
              const Icon = item.icon;
              const selected = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Tooltip key={item.label} title={item.label} placement="right" disableHoverListener={drawerOpen || isMobile}>
                  <Link href={item.href} passHref legacyBehavior>
                    <ListItemButton
                      component="a"
                      selected={selected}
                      aria-label={item.label}
                      onClick={() => isMobile && setDrawerOpen(false)}
                      sx={{
                        minHeight: 44,
                        mx: 0.5,
                        mb: 0.4,
                        px: drawerOpen || isMobile ? 1.5 : 0,
                        justifyContent: drawerOpen || isMobile ? "flex-start" : "center",
                        borderRadius: 1.5,
                        color: selected ? "#f5fff8" : "#c3d2ca",
                        "&:hover": { bgcolor: "rgba(255,255,255,0.07)", color: "#fff" },
                        "&.Mui-selected": { bgcolor: "rgba(169,224,190,0.15)", color: "#f5fff8" },
                        "&.Mui-selected:hover": { bgcolor: "rgba(169,224,190,0.21)" },
                        "&.Mui-selected::before": { content: '""', position: "absolute", left: 0, top: 9, bottom: 9, width: 3, borderRadius: 3, bgcolor: "#a9e0be" },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: drawerOpen || isMobile ? 38 : 0, justifyContent: "center", color: selected ? "#a9e0be" : "#91aa9e" }}>
                        <Icon fontSize="small" />
                      </ListItemIcon>
                      {drawerOpen || isMobile ? <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 13.5, fontWeight: selected ? 700 : 500 }} /> : null}
                    </ListItemButton>
                  </Link>
                </Tooltip>
              );
            })}
          </List>
        </Box>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />
        <Box sx={{ p: drawerOpen || isMobile ? 2 : 1.25, display: "flex", alignItems: "center", justifyContent: drawerOpen || isMobile ? "flex-start" : "center", gap: 1.25, minWidth: 0 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: "#315b49", color: "#d8f0df", fontSize: 12, fontWeight: 700 }}>
            {(user?.name || user?.email || "G").split(/[ @]/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
          </Avatar>
          {drawerOpen || isMobile ? <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" fontWeight={700} noWrap>{user?.name || "Guest session"}</Typography>
            <Typography variant="caption" sx={{ color: "#a8c2b6" }} noWrap>{user?.email || role}</Typography>
          </Box> : null}
        </Box>
      </Drawer>
      <Drawer
        anchor="right"
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        sx={{ "& .MuiDrawer-paper": { width: { xs: "min(92vw, 380px)", sm: 380 }, borderLeft: "1px solid #e2eae5" } }}
      >
        <Toolbar sx={{ borderBottom: "1px solid #e8eeea", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>Notifications</Typography>
            <Typography variant="caption" color="text.secondary">{unreadCount} unread</Typography>
          </Box>
          <IconButton aria-label="Close notifications" onClick={() => setNotifOpen(false)} size="small">×</IconButton>
        </Toolbar>
        <Box sx={{ p: 2, overflowY: "auto" }}>
          <Stack spacing={1}>
            {notifications.length === 0 ? (
              <Box sx={{ py: 5, textAlign: "center" }}>
                <NotificationsIcon sx={{ color: "#93a79d", fontSize: 28, mb: 1 }} />
                <Typography color="text.secondary">You’re all caught up.</Typography>
              </Box>
            ) : null}
            {notifications.map((n) => (
              <Card
                key={n.id}
                variant="outlined"
                sx={{
                  p: 0.5,
                  borderRadius: 2,
                  borderColor: n.read ? "#e5ece8" : "#c8e3d2",
                  bgcolor: n.read ? "#fff" : "#f4faf6",
                }}
              >
                <CardContent sx={{ p: 1 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Box sx={{ pr: 1, flex: 1 }}>
                      <Typography variant="subtitle2" fontWeight={n.read ? 500 : 700}>{n.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(n.createdAt).toLocaleString()}
                      </Typography>
                      {n.librarianRemarks ? (
                        <Typography variant="body2">
                          Remarks: {n.librarianRemarks}
                        </Typography>
                      ) : null}
                    </Box>
                    <Stack>
                      {!n.read ? <Button size="small" onClick={() => markRead(n)} sx={{ whiteSpace: "nowrap" }}>Mark read</Button> : null}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 4 },
          minHeight: "100vh",
          pt: { xs: 10, md: 11 },
          minWidth: 0,
          width: "auto",
          transition: theme.transitions.create("margin", { duration: theme.transitions.duration.standard }),
        }}
      >
        <Toolbar sx={{ display: { xs: "none", md: "block" } }} />
        {content}
      </Box>
    </Box>
  );
}
