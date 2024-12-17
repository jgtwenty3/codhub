import { httpRouter } from "convex/server";
import {httpAction} from "./_generated/server";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";
import {api, internal} from "./_generated/api"


const http = httpRouter();

http.route({
  path:"/lemon-squeezy-webook",
  method:"POST",
  handler:httpAction(async(ctx,request)=>{
    const payloadString = await request.text();
    const signature = request.headers.get("X-Signature");

    if (!signature){
      return new Response("Mising X-Signature Header", {status:400})
    }
    try {
      const payload = await ctx.runAction(internal.lemonsqueezy.verifyWebhook,{
        payload:payloadString,
        signature
      } )

      if (payload.meta.event_name === "order.created"){
        const {data } = payload

        await ctx.runMutation(api.users.upgradeToPro,{
          email:data.atrributes.use_email,
          lemonSqueezyCustomerId: data.attributes.customer_id.toString(),
          lemonSqueezyOrderId: data.id,
          amount: data.attributes.total,
        })
      }
      return new Response("Webhook processed successfully", { status: 200 });
    } catch (error) {
      return new Response("Error processing webhook", { status: 500 })
    }
  })
})

http.route({
    path:"/clerk-webhook",
    method:'POST',

    handler: httpAction(async(ctx,request)=>{
        const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
        if(!webhookSecret){
            throw new Error('Missing CLERK_WEBHOOK_SECRET env variable');
        }

        const svix_id = request.headers.get("svix-id");
        const svix_signature = request.headers.get("svix-signature");
        const svix_timestamp = request.headers.get("svix-timestamp");

        if (!svix_id || !svix_signature || !svix_timestamp) {
            return new Response("Error occurred -- no svix headers", {
              status: 400,
            });
        }
        
        const payload = await request.json();
        const body = JSON.stringify(payload);

        const wh = new Webhook(webhookSecret);
        let evt: WebhookEvent;

        try {
            evt = wh.verify(body, {
              "svix-id": svix_id,
              "svix-timestamp": svix_timestamp,
              "svix-signature": svix_signature,
            }) as WebhookEvent;
          } catch (err) {
            console.error("Error verifying webhook:", err);
            return new Response("Error occurred", { status: 400 });
          }

          const eventType = evt.type;
          if (eventType === "user.created"){

            const { id, email_addresses, first_name, last_name } = evt.data;
            const email = email_addresses[0].email_address;
            const name = `${first_name || ""} ${last_name || ""}`.trim();

            try {
                await ctx.runMutation(api.users.syncUser,{
                    userId:id,
                    email,
                    name,
                });
                
            } catch (error) {
                console.log("Error creating user:", error);
                return new Response("Error creating user", { status: 500 });
            }
          }
          return new Response("Webhook processed successfully", { status: 200 });
    
    }),
});

export default http;