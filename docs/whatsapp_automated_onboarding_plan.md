# 🚀 Plan Técnico: Onboarding Automatizado WhatsApp (Elite Flow)

Este plan describe la arquitectura para implementar el flujo de **Embedded Signup** de Meta, eliminando la necesidad de que el usuario ingrese tokens manualmente.

---

## 🏗️ 1. Frontend: Componente de Registro

Usaremos el **Facebook JavaScript SDK** para lanzar el flujo nativo de Meta.

### Componente Sugerido: `ConnectMetaButton.tsx`
```typescript
const launchWhatsAppSignup = () => {
  // @ts-ignore (FB SDK global)
  FB.login((response) => {
    if (response.authResponse) {
      const { code } = response.authResponse;
      // Enviar 'code' al backend de Entrega
      apiRequest('/whatsapp/auth/exchange', 'POST', { code });
    }
  }, { 
    scope: 'whatsapp_business_management,whatsapp_business_messaging',
    extras: {
      feature: 'whatsapp_embedded_signup',
      session_info: { version: 2 },
      setup_mode: 'direct_enumeration'
    }
  });
};
```

---

## 🏗️ 2. Backend: Intercambio de Tokens

Crearemos un endpoint en **`whatsapp_auth.py`** para procesar el código de Meta.

### Lógica del Endpoint: `/api/v1/whatsapp/auth/exchange`
1.  **Recepción:** Recibe el `code`.
2.  **Llamada a Meta API:** Intercambia el `code` por un `access_token` de usuario usando el `FB_APP_SECRET`.
3.  **Permisos:** Solicita un **Permanent Access Token** (o de larga duración, 60 días) para el número del cliente.
4.  **Almacenamiento:** Vincula el `WABA ID` y el `Phone Number ID` al Tenant activo.

---

## 🏗️ 3. Modificaciones en Base de Datos

Necesitamos ampliar el modelo `Tenant` en **`models.py`** para persistir la identidad de Meta:

```python
class Tenant(SQLModel, table=True):
    # Campos actuales...
    business_whatsapp_number: Optional[str] = None
    
    # 🆕 Nuevos campos para automatización
    meta_waba_id: Optional[str] = None # WhatsApp Business Account ID
    meta_phone_number_id: Optional[str] = None # ID específico del número
    meta_access_token: Optional[str] = None # Token de larga duración
    meta_setup_completed: bool = Field(default=False)
```

---

## 🚩 Hallazgo de Grado Mundial: Webhooks Dinámicos
Al automatizar esto, Entrega debe registrar un **Webhook Global** en la Meta App. Cuando un cliente asocia su número, Meta enviará notificaciones a nuestra URL (`/api/v1/webhooks/whatsapp`) y nosotros discriminaremos el `tenant_id` basándonos en el `phone_number_id` o `waba_id` guardado.
