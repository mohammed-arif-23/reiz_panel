import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { User } from "@/models/User";
import { connectToDatabase } from "@/lib/db";
import AdminSidebar from "@/components/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  const payload = await verifyToken(token);
  if (!payload || !["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(payload.role)) {
    redirect("/dashboard");
  }

  await connectToDatabase();
  const user = await User.findById(payload.userId).select("-password");

  if (!user) {
    redirect("/login");
  }

  const formattedUser = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    designation: user.designation,
  };

  return (
    <div className="flex flex-col min-h-screen md:flex-row bg-[#FAF6F0] text-[#2D221E]">
      <AdminSidebar user={formattedUser} />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
