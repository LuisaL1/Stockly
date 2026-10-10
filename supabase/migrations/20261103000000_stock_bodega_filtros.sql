-- La vista de stock por bodega incluye categoría, marca y códigos: la caja y las bodegas pueden
-- buscar por código (lector de barras) y filtrar por categoría o marca. Idempotente.
create or replace view public.v_stock_bodega as
 select b.id as id_bodega, b.id_empresa, b.nombre as bodega, b.tipo, p.id as id_producto, coalesce(p.nombre_completo, p.descripcion) as descripcion, p.stock_minimo,
        p.precioventa, p.preciocompra,
        case when b.tipo = 'principal'
             then greatest(p.stock - coalesce((select sum(sb_1.cantidad) from stock_bodega sb_1 join bodegas o on o.id = sb_1.id_bodega
                                                where sb_1.id_producto = p.id and o.tipo <> 'principal'), 0::numeric), 0::numeric)
             else coalesce(sb.cantidad, 0::numeric) end as cantidad,
        p.unidad, p.presentacion, p.contenido, p.contenido_unidad,
        c.descripcion as categoria, m.descripcion as marca, p.codigointerno::text as codigointerno, p.codigobarras::text as codigobarras
   from bodegas b
   join productos p on p.id_empresa = b.id_empresa
   left join categorias c on c.id = p.id_categoria
   left join marca m on m.id = p.idmarca
   left join stock_bodega sb on sb.id_bodega = b.id and sb.id_producto = p.id;
