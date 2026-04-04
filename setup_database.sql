INSERT INTO public.tenants (id, slug, name, status, timezone, currency, clients_imported, stock_imported, business_whatsapp_connected, ready, whatsapp_status, created_at, updated_at) 
VALUES ('075c9f92-46e6-495b-865f-4bf119bcece8', 'chocobites', 'ChocoBites', 'active', 'UTC', 'MXN', false, false, false, false, 'disconnected', NOW(), NOW()) 
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();

INSERT INTO public.users (id, email, full_name, platform_role, auth_provider_id, is_active, created_at)
VALUES ('4b2fe84b-f3fe-4131-999c-8b84168f7891', 'test@entrega.space', 'Test User', 'admin', '4b2fe84b-f3fe-4131-999c-8b84168f7891', true, NOW())
ON CONFLICT (auth_provider_id) DO UPDATE SET platform_role = 'admin';

INSERT INTO public.tenant_users (id, tenant_id, user_id, tenant_role, is_default, is_active, created_at)
VALUES ('4b2fe84b-f3fe-4131-999c-8b84168f7891', '075c9f92-46e6-495b-865f-4bf119bcece8', '4b2fe84b-f3fe-4131-999c-8b84168f7891', 'owner', TRUE, TRUE, NOW())
ON CONFLICT (id) DO NOTHING;
