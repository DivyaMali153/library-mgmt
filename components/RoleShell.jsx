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

const drawerWidth = 240;

const navigation = [
  { label: "Dashboard", href: "/", icon: HomeIcon },
  { label: "Books", href: "/books", icon: LibraryBooksIcon },
];

const studentNavigation = [
  { label: "E-books", href: "/ebooks", icon: AutoStoriesIcon },
  { label: "Borrowed Books", href: "/borrowed-books", icon: AssignmentReturnIcon },
  { label: "Requested Books", href: "/requested-books", icon: LibraryBooksIcon },
  { label: "Book History", href: "/book-history", icon: GroupIcon },
];

const librarianNavigation = [
  { label: "E-books", href: "/ebooks", icon: AutoStoriesIcon },
  { label: "Book Requests", href: "/requests", icon: LibraryBooksIcon },
  { label: "Borrowed Books", href: "/borrowed-books", icon: AssignmentReturnIcon },
  { label: "Book History", href: "/book-history", icon: GroupIcon },
  { label: "Borrowers", href: "/borrowers", icon: PersonIcon },
  { label: "Reports", href: "/reports", icon: AssessmentIcon },
  { label: "Profile", href: "/profile", icon: PersonIcon },
];

export function RoleShell({ children }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { role, user, logout } = useRole();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const router = useRouter();

  useEffect(() => {
    setDrawerOpen(!isMobile);
  }, [isMobile]);

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
          ml: isMobile ? 0 : drawerOpen ? `${drawerWidth}px` : 0,
          width: isMobile ? "100%" : `calc(100% - ${drawerWidth}px)`,
          background: "linear-gradient(135deg, #0f766e, #2563eb)",
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 64, sm: 72 }, px: { xs: 1.5, sm: 2 } }}>
          {isMobile ? (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="open navigation"
              onClick={() => setDrawerOpen((prev) => !prev)}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          ) : null}
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontSize: { xs: "1rem", sm: "1.1rem" } }}>
            Pratap College Library
          </Typography>
          <Stack direction="row" spacing={{ xs: 1, sm: 2 }} alignItems="center">
            {!isMobile ? (
              <Typography variant="body2" sx={{ display: { xs: "none", md: "block" } }}>
                {user ? `${user.name} • ${role}` : "Guest"}
              </Typography>
            ) : null}
            {user ? (
              <IconButton
                color="inherit"
                onClick={() => setNotifOpen(!notifOpen)}
                size="large"
              >
                <Badge
                  badgeContent={notifications.filter((n) => !n.read).length}
                  color="error"
                >
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            ) : null}
            {user ? (
              <Button
                color="inherit"
                startIcon={<LogoutIcon />}
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                sx={{ display: { xs: "none", sm: "inline-flex" } }}
              >
                Logout
              </Button>
            ) : null}
          </Stack>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? "temporary" : "persistent"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: isMobile ? "82vw" : drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: isMobile ? "82vw" : drawerWidth,
            boxSizing: "border-box",
            bgcolor: "#101828",
            color: "white",
            borderRight: "1px solid rgba(255,255,255,0.08)",
          },
        }}
      >
        <Toolbar />
        <List>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} href={item.href} passHref legacyBehavior>
                <ListItemButton component="a" onClick={() => isMobile && setDrawerOpen(false)}>
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
                  <Link key={item.label} href={item.href} passHref legacyBehavior>
                    <ListItemButton component="a" onClick={() => isMobile && setDrawerOpen(false)}>
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
                  <Link key={item.label} href={item.href} passHref legacyBehavior>
                    <ListItemButton component="a" onClick={() => isMobile && setDrawerOpen(false)}>
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
      </Drawer>
      <Drawer
        anchor="right"
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        sx={{ "& .MuiDrawer-paper": { width: { xs: "90vw", sm: 360 } } }}
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
                    <Box sx={{ pr: 1, flex: 1 }}>
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
          ml: isMobile ? 0 : drawerOpen ? `${drawerWidth}px` : 0,
          pt: { xs: 10, md: 11 },
          width: "100%",
        }}
      >
        <Toolbar sx={{ display: { xs: "none", md: "block" } }} />
        {content}
      </Box>
    </Box>
  );
}
