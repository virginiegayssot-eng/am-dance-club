"use strict";(()=>{var e={};e.id=329,e.ids=[329],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},14149:(e,t,i)=>{i.r(t),i.d(t,{originalPathname:()=>g,patchFetch:()=>m,requestAsyncStorage:()=>u,routeModule:()=>c,serverHooks:()=>x,staticGenerationAsyncStorage:()=>f});var r={};i.r(r),i.d(r,{POST:()=>p});var s=i(49303),n=i(88716),a=i(60670),o=i(87070),l=i(6943);let d=new(i(82591)).R(process.env.RESEND_API_KEY);async function p(e){let t=(0,l.f)(),{data:{user:i}}=await t.auth.getUser();if(!i)return o.NextResponse.json({error:"Unauthorized"},{status:401});let{data:r}=await t.from("profiles").select("role").eq("id",i.id).single();if(r?.role!=="instructor")return o.NextResponse.json({error:"Forbidden"},{status:403});let{classId:s}=await e.json();if(!s)return o.NextResponse.json({error:"Missing classId"},{status:400});let{data:n}=await t.from("attendance").select("student_id, profiles(full_name, email)").eq("class_id",s).eq("attended",!0);if(!n||0===n.length)return o.NextResponse.json({sent:0});let a=0;for(let e of n){let i=e.student_id,r=e.profiles,{data:n}=await t.from("attendance").select("id").eq("student_id",i).eq("attended",!0).neq("class_id",s).limit(1);if(n&&n.length>0)continue;let o=(r?.full_name??"dancer").split(" ")[0],l=r?.email;l&&(await d.emails.send({from:`THE A.M Dance Club <${process.env.RESEND_FROM}>`,to:l,subject:"How was your first class? \uD83C\uDFB5",html:`
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
          <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;">
            <div style="background:#2041d8;padding:32px;text-align:center;">
              <h1 style="color:#e4c3cc;font-size:28px;margin:0;letter-spacing:2px;">THE A.M</h1>
              <p style="color:#ffffff;margin:4px 0 0;font-size:14px;letter-spacing:1px;">DANCE CLUB</p>
            </div>
            <div style="padding:36px 32px;">
              <h2 style="color:#2041d8;font-size:22px;margin:0 0 16px;">Hey ${o}! 👋</h2>
              <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 16px;">
                So happy you joined us this morning for your first class at THE A.M Dance Club!
              </p>
              <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 24px;">
                If you enjoyed it, we'd love it if you could take 30 seconds to leave us a Google review — it means the world to us and helps other dancers find us! 🙏
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${process.env.GOOGLE_REVIEW_URL}" style="background:#2041d8;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:bold;display:inline-block;">
                  Leave a Review ⭐
                </a>
              </div>
              <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 8px;">See you next Friday! 💃</p>
              <p style="color:#444;font-size:16px;margin:0;">— Virginie &amp; THE A.M Dance Club team</p>
            </div>
            <div style="background:#e4c3cc;padding:20px;text-align:center;">
              <p style="color:#2041d8;font-size:12px;margin:0;">Every Friday \xb7 7:00 AM \xb7 North Steyne Surf Club, Manly NSW</p>
            </div>
          </div>
        </body>
        </html>
      `}),a++)}return o.NextResponse.json({sent:a})}let c=new s.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/instructor/send-review-emails/route",pathname:"/api/instructor/send-review-emails",filename:"route",bundlePath:"app/api/instructor/send-review-emails/route"},resolvedPagePath:"/Users/virginiegayssot/Desktop/CODE_Claude/am-dance-club/src/app/api/instructor/send-review-emails/route.ts",nextConfigOutput:"standalone",userland:r}),{requestAsyncStorage:u,staticGenerationAsyncStorage:f,serverHooks:x}=c,g="/api/instructor/send-review-emails/route";function m(){return(0,a.patchFetch)({serverHooks:x,staticGenerationAsyncStorage:f})}},6943:(e,t,i)=>{i.d(t,{f:()=>n});var r=i(67721),s=i(71615);function n(){let e=(0,s.cookies)();return(0,r.createServerClient)("https://trsseitecjigqlqqscue.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyc3NlaXRlY2ppZ3FscXFzY3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5OTE5MTAsImV4cCI6MjA5NDU2NzkxMH0.nT5hnah-z51flvriqoSFyH8Ml15XrBdALyqKWLTgobE",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:i,options:r})=>e.set(t,i,r))}catch{}}}})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var i=e=>t(t.s=e),r=t.X(0,[948,890,355,591],()=>i(14149));module.exports=r})();