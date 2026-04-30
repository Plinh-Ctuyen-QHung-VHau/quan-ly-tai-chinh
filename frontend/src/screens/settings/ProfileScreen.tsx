import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppInput } from "../../components/AppInput";
import { ScreenHero } from "../../components/ScreenHero";
import { COLORS, shadow } from "../../constants/ui";
import { updateMyProfile } from "../../services/identityApi";
import { useAppDataStore } from "../../store/appDataStore";

function getInitials(name: string) {
  const text = name.trim() || "U";
  return text
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function ProfileScreen() {
  const profile = useAppDataStore((s) => s.profile);
  const email = useAppDataStore((s) => s.userEmail);
  const emailConfirmed = useAppDataStore((s) => s.emailConfirmed);
  const createdAt = useAppDataStore((s) => s.userCreatedAt);
  const setProfileGlobal = useAppDataStore((s) => s.setProfile);

  const full_name = profile?.full_name ?? "";

  const [editName, setEditName] = useState(full_name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const handleSave = async () => {
    if (!editName.trim()) {
      setError("Họ và tên không được để trống.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const result = await updateMyProfile({ full_name: editName.trim() });
      setProfileGlobal(result);
      setEditing(false);
      Alert.alert("Đã lưu", "Hồ sơ đã được cập nhật.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật hồ sơ.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditName(full_name);
    setError("");
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <ScreenHero
        kicker="Hồ sơ"
        title="Thông tin tài khoản"
        subtitle="Xem và cập nhật thông tin cá nhân của bạn."
      />

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Avatar card */}
      <View style={styles.avatarCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{getInitials(full_name)}</Text>
        </View>
        <Text style={styles.avatarName}>{full_name || "Người dùng"}</Text>
        <Text style={styles.avatarEmail}>{email}</Text>
        {emailConfirmed ? (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>Email đã xác thực</Text>
          </View>
        ) : (
          <View style={styles.unverifiedBadge}>
            <Text style={styles.unverifiedText}>Chưa xác thực email</Text>
          </View>
        )}
      </View>

      {/* Thông tin tài khoản */}
      <View style={styles.card}>
        {/* Header với nút Sửa */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardLabel}>Thông tin tài khoản</Text>
          {!editing && (
            <Pressable
              style={styles.editBtn}
              onPress={() => {
                setEditName(full_name);
                setEditing(true);
              }}
            >
              <Text style={styles.editBtnText}>Sửa</Text>
            </Pressable>
          )}
        </View>

        {/* Họ và tên — có thể edit inline */}
        <View style={styles.infoRow}>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Họ và tên</Text>
            {editing ? (
              <AppInput
                label=""
                value={editName}
                onChangeText={setEditName}
                placeholder="VD: Nguyễn Văn A"
                autoFocus
              />
            ) : (
              <Text style={styles.infoValue}>{full_name || "—"}</Text>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        <InfoRow label="Email" value={email || "—"} />
        <View style={styles.divider} />
        <InfoRow label="Ngày tham gia" value={formatDate(createdAt)} />

        {/* Action buttons khi editing */}
        {editing && (
          <View style={styles.editActions}>
            <Pressable style={styles.cancelBtn} onPress={handleCancelEdit}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <AppButton
                title="Lưu"
                onPress={() => void handleSave()}
                loading={saving}
              />
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

type InfoRowProps = { label: string; value: string };
function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 120,
    backgroundColor: COLORS.bg,
  },

  errorBanner: {
    backgroundColor: COLORS.expenseSoft,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.expenseBorder,
  },
  errorText: { color: COLORS.expense, fontWeight: "700", fontSize: 13 },

  // Avatar
  avatarCard: {
    ...shadow,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: "center",
    marginBottom: 14,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: COLORS.blueSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 3,
    borderColor: COLORS.blue + "33",
  },
  avatarText: { color: COLORS.blue, fontSize: 30, fontWeight: "900" },
  avatarName: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
    textAlign: "center",
  },
  avatarEmail: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  verifiedBadge: {
    backgroundColor: COLORS.incomeSoft,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.incomeBorder,
  },
  verifiedText: { color: COLORS.income, fontSize: 12, fontWeight: "800" },
  unverifiedBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  unverifiedText: { color: "#D97706", fontSize: 12, fontWeight: "800" },

  // Card
  card: {
    ...shadow,
    backgroundColor: COLORS.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  editBtn: {
    backgroundColor: COLORS.blueLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.blueSoft,
  },
  editBtnText: { color: COLORS.blue, fontWeight: "900", fontSize: 13 },

  // Info rows
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  infoContent: { flex: 1 },
  infoLabel: { color: COLORS.muted, fontSize: 11, fontWeight: "700", marginBottom: 2 },
  infoValue: { color: COLORS.text, fontSize: 15, fontWeight: "700" },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 2 },

  // Edit actions
  editActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
  },
  cancelBtnText: { color: COLORS.muted, fontWeight: "700", fontSize: 14 },
});