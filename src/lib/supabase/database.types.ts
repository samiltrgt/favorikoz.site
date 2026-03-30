export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          image: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          image?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string | null
          image?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      products: {
        Row: {
          id: string
          slug: string
          name: string
          brand: string | null
          price: number
          original_price: number | null
          discount: number | null
          image: string | null
          images: string[]
          rating: number
          reviews_count: number
          is_new: boolean
          is_best_seller: boolean
          in_stock: boolean
          stock_quantity: number
          category_slug: string | null
          description: string | null
          barcode: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          slug: string
          name: string
          brand?: string | null
          price: number
          original_price?: number | null
          discount?: number | null
          image?: string | null
          images?: string[]
          rating?: number
          reviews_count?: number
          is_new?: boolean
          is_best_seller?: boolean
          in_stock?: boolean
          stock_quantity?: number
          category_slug?: string | null
          description?: string | null
          barcode?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          brand?: string | null
          price?: number
          original_price?: number | null
          discount?: number | null
          image?: string | null
          images?: string[]
          rating?: number
          reviews_count?: number
          is_new?: boolean
          is_best_seller?: boolean
          in_stock?: boolean
          stock_quantity?: number
          category_slug?: string | null
          description?: string | null
          barcode?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          name: string | null
          phone: string | null
          role: 'customer' | 'admin' | 'editor'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          name?: string | null
          phone?: string | null
          role?: 'customer' | 'admin' | 'editor'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          name?: string | null
          phone?: string | null
          role?: 'customer' | 'admin' | 'editor'
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          user_id: string | null
          customer_name: string
          customer_email: string
          customer_phone: string | null
          customer_tc: string | null
          shipping_address: Json
          billing_address: Json | null
          items: Json
          subtotal: number
          shipping_cost: number
          total: number
          coupon_code: string | null
          coupon_discount_type: string | null
          coupon_discount_value: number | null
          discount_amount: number
          subtotal_before_coupon: number | null
          subtotal_after_coupon: number | null
          status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled'
          payment_method: string
          payment_status: 'pending' | 'completed' | 'failed'
          payment_token: string | null
          iyzico_basket_id: string | null
          invoice_uuid: string | null
          invoice_pdf_url: string | null
          invoiced_at: string | null
          tracking_number: string | null
          carrier: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          user_id?: string | null
          customer_name: string
          customer_email: string
          customer_phone?: string | null
          customer_tc?: string | null
          shipping_address: Json
          billing_address?: Json | null
          items: Json
          subtotal: number
          shipping_cost: number
          total: number
          coupon_code?: string | null
          coupon_discount_type?: string | null
          coupon_discount_value?: number | null
          discount_amount?: number
          subtotal_before_coupon?: number | null
          subtotal_after_coupon?: number | null
          status?: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled'
          payment_method: string
          payment_status?: 'pending' | 'completed' | 'failed'
          payment_token?: string | null
          iyzico_basket_id?: string | null
          invoice_uuid?: string | null
          invoice_pdf_url?: string | null
          invoiced_at?: string | null
          tracking_number?: string | null
          carrier?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          user_id?: string | null
          customer_name?: string
          customer_email?: string
          customer_phone?: string | null
          customer_tc?: string | null
          shipping_address?: Json
          billing_address?: Json | null
          items?: Json
          subtotal?: number
          shipping_cost?: number
          total?: number
          coupon_code?: string | null
          coupon_discount_type?: string | null
          coupon_discount_value?: number | null
          discount_amount?: number
          subtotal_before_coupon?: number | null
          subtotal_after_coupon?: number | null
          status?: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled'
          payment_method?: string
          payment_status?: 'pending' | 'completed' | 'failed'
          payment_token?: string | null
          iyzico_basket_id?: string | null
          invoice_uuid?: string | null
          invoice_pdf_url?: string | null
          invoiced_at?: string | null
          tracking_number?: string | null
          carrier?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          product_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          created_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          product_id: string
          user_id: string | null
          guest_name: string | null
          rating: number
          comment: string
          verified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          user_id?: string | null
          guest_name?: string | null
          rating: number
          comment: string
          verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          user_id?: string | null
          guest_name?: string | null
          rating?: number
          comment?: string
          verified?: boolean
          created_at?: string
        }
      }
      banners: {
        Row: {
          id: string
          title: string
          subtitle: string | null
          image: string
          link: string | null
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          subtitle?: string | null
          image: string
          link?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          subtitle?: string | null
          image?: string
          link?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      coupons: {
        Row: {
          id: string
          code: string
          discount_type: 'percent' | 'fixed'
          discount_value: number
          valid_from: string | null
          valid_until: string | null
          max_total_uses: number | null
          max_uses_per_customer: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          discount_type: 'percent' | 'fixed'
          discount_value: number
          valid_from?: string | null
          valid_until?: string | null
          max_total_uses?: number | null
          max_uses_per_customer?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          discount_type?: 'percent' | 'fixed'
          discount_value?: number
          valid_from?: string | null
          valid_until?: string | null
          max_total_uses?: number | null
          max_uses_per_customer?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      coupon_usages: {
        Row: {
          id: string
          coupon_id: string
          order_id: string
          customer_identity_key: string
          used_at: string
        }
        Insert: {
          id?: string
          coupon_id: string
          order_id: string
          customer_identity_key: string
          used_at?: string
        }
        Update: {
          id?: string
          coupon_id?: string
          order_id?: string
          customer_identity_key?: string
          used_at?: string
        }
      }
      promo_banner_products: {
        Row: {
          id: string
          banner_id: string
          product_id: string
          display_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          banner_id: string
          product_id: string
          display_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          banner_id?: string
          product_id?: string
          display_order?: number
          is_active?: boolean
          created_at?: string
        }
      }
      featured_products: {
        Row: {
          id: string
          product_id: string
          display_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          display_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          display_order?: number
          is_active?: boolean
          created_at?: string
        }
      }
      own_production_products: {
        Row: {
          id: string
          product_id: string
          display_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          display_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          display_order?: number
          is_active?: boolean
          created_at?: string
        }
      }
      home_carousel_products: {
        Row: {
          id: string
          product_id: string
          display_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          display_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          display_order?: number
          is_active?: boolean
          created_at?: string
        }
      }
      scroll_hero_products: {
        Row: {
          id: string
          product_id: string | null
          image_url: string | null
          display_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id?: string | null
          image_url?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string | null
          image_url?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
        }
      }
      hero_products: {
        Row: {
          id: string
          name: string
          description: string | null
          image: string
          link: string | null
          slide_index: number
          slot_index: number
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          image: string
          link?: string | null
          slide_index?: number
          slot_index?: number
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          image?: string
          link?: string | null
          slide_index?: number
          slot_index?: number
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: { uid: string }
        Returns: boolean
      }
    }
    Enums: {
      order_status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled'
      payment_status: 'pending' | 'completed' | 'failed'
    }
  }
}

