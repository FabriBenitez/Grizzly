export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface BaseDeDatos {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          role: "customer" | "admin";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          role?: "customer" | "admin";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string | null;
          phone?: string | null;
          role?: "customer" | "admin";
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      brands: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          logo_url?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          category_id: string | null;
          brand_id: string | null;
          name: string;
          slug: string;
          short_description: string | null;
          description: string | null;
          sku: string | null;
          price: number;
          promo_price: number | null;
          transfer_price: number | null;
          stock: number;
          is_active: boolean;
          is_featured: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id?: string | null;
          brand_id?: string | null;
          name: string;
          slug: string;
          short_description?: string | null;
          description?: string | null;
          sku?: string | null;
          price: number;
          promo_price?: number | null;
          transfer_price?: number | null;
          stock?: number;
          is_active?: boolean;
          is_featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          brand_id?: string | null;
          name?: string;
          slug?: string;
          short_description?: string | null;
          description?: string | null;
          sku?: string | null;
          price?: number;
          promo_price?: number | null;
          transfer_price?: number | null;
          stock?: number;
          is_active?: boolean;
          is_featured?: boolean;
          updated_at?: string;
        };
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          storage_path: string;
          public_url: string | null;
          alt_text: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          storage_path: string;
          public_url?: string | null;
          alt_text?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          storage_path?: string;
          public_url?: string | null;
          alt_text?: string | null;
          sort_order?: number;
        };
      };
      hero_banners: {
        Row: {
          id: string;
          title: string;
          subtitle: string | null;
          image_url: string | null;
          cta_label: string | null;
          cta_href: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          subtitle?: string | null;
          image_url?: string | null;
          cta_label?: string | null;
          cta_href?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          subtitle?: string | null;
          image_url?: string | null;
          cta_label?: string | null;
          cta_href?: string | null;
          sort_order?: number;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          order_number: string;
          customer_name: string;
          customer_email: string;
          customer_phone: string | null;
          shipping_type: "delivery" | "pickup";
          shipping_address_json: Json | null;
          notes: string | null;
          subtotal: number;
          discount: number;
          shipping_cost: number;
          total: number;
          status:
            | "pending"
            | "paid"
            | "packing"
            | "shipped"
            | "delivered"
            | "cancelled";
          payment_status: "pending" | "approved" | "rejected" | "refunded";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          order_number?: string;
          customer_name: string;
          customer_email: string;
          customer_phone?: string | null;
          shipping_type?: "delivery" | "pickup";
          shipping_address_json?: Json | null;
          notes?: string | null;
          subtotal?: number;
          discount?: number;
          shipping_cost?: number;
          total?: number;
          status?: "pending" | "paid" | "packing" | "shipped" | "delivered" | "cancelled";
          payment_status?: "pending" | "approved" | "rejected" | "refunded";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string | null;
          customer_name?: string;
          customer_email?: string;
          customer_phone?: string | null;
          shipping_type?: "delivery" | "pickup";
          shipping_address_json?: Json | null;
          notes?: string | null;
          subtotal?: number;
          discount?: number;
          shipping_cost?: number;
          total?: number;
          status?: "pending" | "paid" | "packing" | "shipped" | "delivered" | "cancelled";
          payment_status?: "pending" | "approved" | "rejected" | "refunded";
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          unit_price: number;
          promo_price: number | null;
          quantity: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          unit_price: number;
          promo_price?: number | null;
          quantity: number;
          line_total: number;
          created_at?: string;
        };
        Update: {
          product_id?: string | null;
          product_name?: string;
          unit_price?: number;
          promo_price?: number | null;
          quantity?: number;
          line_total?: number;
        };
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          provider: string;
          preference_id: string | null;
          payment_id: string | null;
          external_reference: string | null;
          amount: number;
          status: "pending" | "approved" | "rejected" | "refunded";
          payment_method: string | null;
          approved_at: string | null;
          rejected_at: string | null;
          payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          provider?: string;
          preference_id?: string | null;
          payment_id?: string | null;
          external_reference?: string | null;
          amount: number;
          status?: "pending" | "approved" | "rejected" | "refunded";
          payment_method?: string | null;
          approved_at?: string | null;
          rejected_at?: string | null;
          payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          provider?: string;
          preference_id?: string | null;
          payment_id?: string | null;
          external_reference?: string | null;
          amount?: number;
          status?: "pending" | "approved" | "rejected" | "refunded";
          payment_method?: string | null;
          approved_at?: string | null;
          rejected_at?: string | null;
          payload?: Json;
          updated_at?: string;
        };
      };
    };
  };
}
