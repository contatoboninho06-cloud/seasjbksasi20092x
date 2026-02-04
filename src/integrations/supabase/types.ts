export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          complement: string | null
          created_at: string
          id: string
          is_default: boolean | null
          neighborhood: string
          number: string
          state: string
          street: string
          user_id: string | null
          zip_code: string
        }
        Insert: {
          city: string
          complement?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          neighborhood: string
          number: string
          state: string
          street: string
          user_id?: string | null
          zip_code: string
        }
        Update: {
          city?: string
          complement?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          neighborhood?: string
          number?: string
          state?: string
          street?: string
          user_id?: string | null
          zip_code?: string
        }
        Relationships: []
      }
      blocked_customers: {
        Row: {
          block_type: string
          block_value: string
          blocked_at: string | null
          blocked_by: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          reason: string | null
        }
        Insert: {
          block_type: string
          block_value: string
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string | null
        }
        Update: {
          block_type?: string
          block_value?: string
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      checkout_analytics: {
        Row: {
          created_at: string
          discount: number | null
          event_type: string
          id: string
          location: Json | null
          metadata: Json | null
          payment_method: string | null
          products: Json | null
          session_id: string
          shipping_cost: number | null
          store_id: string | null
          subtotal: number | null
          total: number | null
        }
        Insert: {
          created_at?: string
          discount?: number | null
          event_type: string
          id?: string
          location?: Json | null
          metadata?: Json | null
          payment_method?: string | null
          products?: Json | null
          session_id: string
          shipping_cost?: number | null
          store_id?: string | null
          subtotal?: number | null
          total?: number | null
        }
        Update: {
          created_at?: string
          discount?: number | null
          event_type?: string
          id?: string
          location?: Json | null
          metadata?: Json | null
          payment_method?: string | null
          products?: Json | null
          session_id?: string
          shipping_cost?: number | null
          store_id?: string | null
          subtotal?: number | null
          total?: number | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string | null
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order_value: number | null
          used_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string | null
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_value?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string | null
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_value?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          city: string | null
          created_at: string
          delivery_fee: number
          delivery_time: number | null
          id: string
          is_active: boolean | null
          neighborhood: string | null
          zip_code_end: string
          zip_code_start: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          delivery_fee?: number
          delivery_time?: number | null
          id?: string
          is_active?: boolean | null
          neighborhood?: string | null
          zip_code_end: string
          zip_code_start: string
        }
        Update: {
          city?: string | null
          created_at?: string
          delivery_fee?: number
          delivery_time?: number | null
          id?: string
          is_active?: boolean | null
          neighborhood?: string | null
          zip_code_end?: string
          zip_code_start?: string
        }
        Relationships: []
      }
      google_ads_conversion_logs: {
        Row: {
          conversion_label: string
          conversion_value: number
          created_at: string
          currency: string | null
          error_message: string | null
          gclid: string | null
          id: string
          method: string
          order_id: string | null
          sent_at: string
          status: string
          transaction_id: string | null
        }
        Insert: {
          conversion_label: string
          conversion_value: number
          created_at?: string
          currency?: string | null
          error_message?: string | null
          gclid?: string | null
          id?: string
          method: string
          order_id?: string | null
          sent_at?: string
          status: string
          transaction_id?: string | null
        }
        Update: {
          conversion_label?: string
          conversion_value?: number
          created_at?: string
          currency?: string | null
          error_message?: string | null
          gclid?: string | null
          id?: string
          method?: string
          order_id?: string | null
          sent_at?: string
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_ads_conversion_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_conversion_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string
          event_name: string
          id: string
          method: string
          order_id: string | null
          pixel_id: string
          response: Json | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id: string
          event_name: string
          id?: string
          method: string
          order_id?: string | null
          pixel_id: string
          response?: Json | null
          status: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_name?: string
          id?: string
          method?: string
          order_id?: string | null
          pixel_id?: string
          response?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_conversion_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_options: {
        Row: {
          created_at: string
          id: string
          option_name: string
          option_price: number | null
          order_item_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_name: string
          option_price?: number | null
          order_item_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_name?: string
          option_price?: number | null
          order_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_item_options_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_id: string | null
          created_at: string
          customer_device: string | null
          customer_email: string | null
          customer_ip: string | null
          customer_name: string
          customer_phone: string
          delivery_address: string | null
          delivery_fee: number | null
          discount: number | null
          estimated_delivery_time: string | null
          gclid: string | null
          hypepay_transaction_id: string | null
          id: string
          is_pickup: boolean | null
          notes: string | null
          payevo_transaction_id: string | null
          payment_gateway: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          pix_expiration: string | null
          pix_qrcode: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
          utm_data: Json | null
        }
        Insert: {
          address_id?: string | null
          created_at?: string
          customer_device?: string | null
          customer_email?: string | null
          customer_ip?: string | null
          customer_name: string
          customer_phone: string
          delivery_address?: string | null
          delivery_fee?: number | null
          discount?: number | null
          estimated_delivery_time?: string | null
          gclid?: string | null
          hypepay_transaction_id?: string | null
          id?: string
          is_pickup?: boolean | null
          notes?: string | null
          payevo_transaction_id?: string | null
          payment_gateway?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          pix_expiration?: string | null
          pix_qrcode?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          total: number
          updated_at?: string
          user_id?: string | null
          utm_data?: Json | null
        }
        Update: {
          address_id?: string | null
          created_at?: string
          customer_device?: string | null
          customer_email?: string | null
          customer_ip?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_address?: string | null
          delivery_fee?: number | null
          discount?: number | null
          estimated_delivery_time?: string | null
          gclid?: string | null
          hypepay_transaction_id?: string | null
          id?: string
          is_pickup?: boolean | null
          notes?: string | null
          payevo_transaction_id?: string | null
          payment_gateway?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          pix_expiration?: string | null
          pix_qrcode?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
          utm_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      product_options: {
        Row: {
          created_at: string
          display_order: number | null
          group_id: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          price: number | null
          product_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          group_id?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          price?: number | null
          product_id: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          group_id?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          price?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_options_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "variant_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          is_featured: boolean | null
          name: string
          original_price: number | null
          preparation_time: number | null
          price: number
          product_code: string | null
          stock_quantity: number | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_featured?: boolean | null
          name: string
          original_price?: number | null
          preparation_time?: number | null
          price: number
          product_code?: string | null
          stock_quantity?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_featured?: boolean | null
          name?: string
          original_price?: number | null
          preparation_time?: number | null
          price?: number
          product_code?: string | null
          stock_quantity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          banner_url: string | null
          closing_time: string | null
          created_at: string
          delivery_time_max: number | null
          delivery_time_min: number | null
          favicon_url: string | null
          google_ads_conversion_id: string | null
          google_ads_labels: Json | null
          hypepay_api_key: string | null
          hypepay_base_url: string | null
          id: string
          is_open: boolean | null
          logo_url: string | null
          meta_access_token: string | null
          meta_description: string | null
          meta_pixel_id: string | null
          min_order_value: number | null
          opening_time: string | null
          payevo_secret_key: string | null
          pix_beneficiary: string | null
          pix_key: string | null
          pix_key_type: string | null
          primary_gateway: string | null
          registration_enabled: boolean | null
          store_address: string | null
          store_email: string | null
          store_name: string | null
          store_phone: string | null
          store_subtitle: string | null
          updated_at: string
          utmify_pixel_id: string | null
          utmify_token: string | null
          working_days: string[] | null
        }
        Insert: {
          banner_url?: string | null
          closing_time?: string | null
          created_at?: string
          delivery_time_max?: number | null
          delivery_time_min?: number | null
          favicon_url?: string | null
          google_ads_conversion_id?: string | null
          google_ads_labels?: Json | null
          hypepay_api_key?: string | null
          hypepay_base_url?: string | null
          id?: string
          is_open?: boolean | null
          logo_url?: string | null
          meta_access_token?: string | null
          meta_description?: string | null
          meta_pixel_id?: string | null
          min_order_value?: number | null
          opening_time?: string | null
          payevo_secret_key?: string | null
          pix_beneficiary?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          primary_gateway?: string | null
          registration_enabled?: boolean | null
          store_address?: string | null
          store_email?: string | null
          store_name?: string | null
          store_phone?: string | null
          store_subtitle?: string | null
          updated_at?: string
          utmify_pixel_id?: string | null
          utmify_token?: string | null
          working_days?: string[] | null
        }
        Update: {
          banner_url?: string | null
          closing_time?: string | null
          created_at?: string
          delivery_time_max?: number | null
          delivery_time_min?: number | null
          favicon_url?: string | null
          google_ads_conversion_id?: string | null
          google_ads_labels?: Json | null
          hypepay_api_key?: string | null
          hypepay_base_url?: string | null
          id?: string
          is_open?: boolean | null
          logo_url?: string | null
          meta_access_token?: string | null
          meta_description?: string | null
          meta_pixel_id?: string | null
          min_order_value?: number | null
          opening_time?: string | null
          payevo_secret_key?: string | null
          pix_beneficiary?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          primary_gateway?: string | null
          registration_enabled?: boolean | null
          store_address?: string | null
          store_email?: string | null
          store_name?: string | null
          store_phone?: string | null
          store_subtitle?: string | null
          updated_at?: string
          utmify_pixel_id?: string | null
          utmify_token?: string | null
          working_days?: string[] | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      utmify_conversion_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          order_id: string | null
          response_body: Json | null
          response_status: number | null
          status_sent: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          order_id?: string | null
          response_body?: Json | null
          response_status?: number | null
          status_sent: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          order_id?: string | null
          response_body?: Json | null
          response_status?: number | null
          status_sent?: string
        }
        Relationships: [
          {
            foreignKeyName: "utmify_conversion_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      variant_groups: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          name: string
          product_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name: string
          product_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_order: { Args: { order_id: string }; Returns: boolean }
      can_access_order_item: {
        Args: { order_item_id: string }
        Returns: boolean
      }
      check_is_admin: { Args: { user_id_param: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
      payment_status: "pending" | "paid" | "failed" | "refunded"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      payment_status: ["pending", "paid", "failed", "refunded"],
    },
  },
} as const
