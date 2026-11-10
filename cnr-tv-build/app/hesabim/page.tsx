import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountPanel from "@/components/account-panel";
export const dynamic="force-dynamic";
export default async function AccountPage(){
 const supabase=await createClient();const{data,error}=await supabase.auth.getClaims();const subject=data?.claims?.sub;
 if(error||typeof subject!=="string")redirect("/giris?next=/hesabim");
 const{data:profile}=await supabase.from("profiles").select("id,username,full_name,avatar_url,bio,role,is_public,created_at").eq("id",subject).maybeSingle();
 return <main className="cnr-account-page"><AccountPanel profile={profile}/></main>;
}
