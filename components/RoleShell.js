"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
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
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import Badge from "@mui/material/Badge";
// LibraryAddIcon removed: upload moved to E-books page
import HomeIcon from "@mui/icons-material/Home";
import PersonIcon from "@mui/icons-material/Person";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn";
import GroupIcon from "@mui/icons-material/Group";
import LogoutIcon from "@mui/icons-material/Logout";
import { useRole } from "./RoleProvider";

const drawerWidth = 240;

const navigation = [
  { label: "Dashboard", href: "/", icon: HomeIcon },
  { label: "Books", href: "/books", icon: LibraryBooksIcon },
];

const studentNavigation = [
  { label: "E-books", href: "/ebooks", icon: AutoStoriesIcon },
  { label: "Book History", href: "/book-history", icon: GroupIcon },
];

const librarianNavigation = [
  { label: "E-books", href: "/ebooks", icon: AutoStoriesIcon },
  { label: "Book Requests", href: "/requests", icon: LibraryBooksIcon },
  { label: "Borrowers", href: "/borrowers", icon: PersonIcon },
  { label: "Reports", href: "/reports", icon: AssessmentIcon },
  { label: "Profile", href: "/profile", icon: PersonIcon },
];

export function RoleShell({ children }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { role, user, logout } = useRole();
  const [drawerOpen, setDrawerOpen] = useState(true);
  const router = useRouter();

  const content = useMemo(() => children, [children]);

  useEffect(() => {
    if (!user?.email) return;
    const load = async () => {
      const res = await fetch(
        `/api/notifications?email=${encodeURIComponent(user.email)}`,
      );
      setNotifications(await res.json());
    };
    load();
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
          ml: `${drawerWidth}px`,
          width: `calc(100% - ${drawerWidth}px)`,
          background: "linear-gradient(135deg, #0f766e, #2563eb)",
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Pratap College Library
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2">
              {user ? `${user.name} • ${role}` : "Guest"}
            </Typography>
            {user ? (
              <IconButton
                color="inherit"
                onClick={() => setNotifOpen(!notifOpen)}
              >
                <Badge
                  badgeContent={notifications.filter((n) => !n.read).length}
                  color="error"
                >
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            ) : null}
            {/* librarian-only AppBar actions removed; upload moved to E-books page */}
            {user ? (
              <Button
                color="inherit"
                startIcon={<LogoutIcon />}
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
              >
                Logout
              </Button>
            ) : null}
          </Stack>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{
          width: drawerOpen ? drawerWidth : 0,
          flexShrink: 0,
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          bgcolor: "#101828",
          color: "white",
          overflowY: "auto",
          transition: "width 0.2s ease",
          borderRight: drawerOpen ? "1px solid rgba(255,255,255,0.08)" : "none",
        }}
      >
        {drawerOpen ? (
          <>
            <Toolbar />
            <List>
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    passHref
                    legacyBehavior
                  >
                    <ListItemButton component="a">
                      <ListItemIcon>
                        <Icon sx={{ color: "white" }} />
                      </ListItemIcon>
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  </Link>
                );
              })}
              {role === "Student"
                ? studentNavigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        passHref
                        legacyBehavior
                      >
                        <ListItemButton component="a">
                          <ListItemIcon>
                            <Icon sx={{ color: "white" }} />
                          </ListItemIcon>
                          <ListItemText primary={item.label} />
                        </ListItemButton>
                      </Link>
                    );
                  })
                : null}
              {role === "Librarian"
                ? librarianNavigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        passHref
                        legacyBehavior
                      >
                        <ListItemButton component="a">
                          <ListItemIcon>
                            <Icon sx={{ color: "white" }} />
                          </ListItemIcon>
                          <ListItemText primary={item.label} />
                        </ListItemButton>
                      </Link>
                    );
                  })
                : null}
            </List>
            <Divider sx={{ bgcolor: "rgba(255,255,255,0.2)" }} />
            <Box sx={{ p: 2 }}>
              <Typography variant="caption" color="rgba(255,255,255,0.7)">
                Developed by Himani Mahajan
              </Typography>
            </Box>
          </>
        ) : null}
      </Box>
      <Drawer
        anchor="right"
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        sx={{ "& .MuiDrawer-paper": { width: 360 } }}
      >
        <Toolbar />
        <Box sx={{ p: 2 }}>
          <Typography variant="h6">Notifications</Typography>
          <Stack spacing={1} sx={{ mt: 2 }}>
            {notifications.length === 0 ? (
              <Typography color="text.secondary">No notifications</Typography>
            ) : null}
            {notifications.map((n) => (
              <Card
                key={n.id}
                variant="outlined"
                sx={{
                  p: 1,
                  bgcolor: n.read ? "background.paper" : "rgba(0,0,0,0.03)",
                }}
              >
                <CardContent sx={{ p: 1 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Box>
                      <Typography variant="subtitle2">{n.title}</Typography>
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
                      <Button size="small" onClick={() => markRead(n)}>
                        Mark read
                      </Button>
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
          ml: drawerOpen ? `${drawerWidth}px` : 0,
        }}
      >
        <Toolbar />
        {content}
      </Box>
      {/* Upload dialog */}
      {/* Upload dialog removed from AppBar; upload now available on E-books page */}
    </Box>
  );
}
