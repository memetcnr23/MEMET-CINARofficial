import AuthForm from "@/components/auth-form";
import { Suspense } from "react";
export default function PasswordResetPage(){return <main className="cnr-auth-page"><Suspense fallback={<div className="cnr-auth-loading">CNR ÜYE ALANI</div>}><AuthForm initialMode="updatePassword"/></Suspense></main>}
