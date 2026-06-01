-- Migration: 20260601000000_stock_and_coupons_fixes.sql
-- Description: Triggers to handle stock decrementing and coupon restoration securely.

-- 1. Decrementar stock cuando el pago es aprobado
create or replace function public.decrement_stock_on_payment_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
begin
  -- Solo accionar si el pago pasa de no-aprobado a aprobado
  if new.status = 'approved' and old.status != 'approved' then
    for item in select * from public.order_items where order_id = new.order_id loop
      
      -- 1. Actualizar el stock del producto
      update public.products
      set stock = stock - item.quantity
      where id = item.product_id;

      -- 2. Insertar movimiento de stock
      insert into public.stock_movements (
        product_id,
        variant_id,
        movement_type,
        quantity,
        reason,
        order_id,
        note
      ) values (
        item.product_id,
        item.variant_id,
        'out',
        -(item.quantity),
        'Order Payment Approved',
        new.order_id,
        'Stock decremented automatically upon payment approval'
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_decrement_stock_on_payment_approval on public.payments;
create trigger trg_decrement_stock_on_payment_approval
after update on public.payments
for each row
execute function public.decrement_stock_on_payment_approval();


-- 2. Restaurar uso de cupón si el pago falla o se devuelve
create or replace function public.restore_coupon_on_payment_rejection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Si el pago pasa a rechazado o devuelto, eliminamos el uso del cupón para que el usuario no lo pierda
  if (new.status = 'rejected' or new.status = 'refunded') 
     and (old.status != 'rejected' and old.status != 'refunded') then
    
    delete from public.coupon_usages where order_id = new.order_id;
    
  end if;
  return new;
end;
$$;

drop trigger if exists trg_restore_coupon_on_payment_rejection on public.payments;
create trigger trg_restore_coupon_on_payment_rejection
after update on public.payments
for each row
execute function public.restore_coupon_on_payment_rejection();
