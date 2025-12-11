import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Template {
  id: string;
  name: string;
  description: string | null;
  selected_panels: string[];
  window_size: number;
  step_size: number;
  is_public: boolean;
  created_at: string;
}

export function useTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    if (!user) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .or(`user_id.eq.${user.id},is_public.eq.true`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, [user]);

  const saveTemplate = async (
    name: string,
    selectedPanels: string[],
    description?: string,
    windowSize = 45,
    stepSize = 3,
    isPublic = false
  ) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Please sign in to save templates' });
      return null;
    }

    const { data, error } = await supabase
      .from('templates')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        selected_panels: selectedPanels,
        window_size: windowSize,
        step_size: stepSize,
        is_public: isPublic
      })
      .select()
      .single();

    if (error) {
      toast({ variant: 'destructive', title: 'Failed to save template', description: error.message });
      return null;
    }

    toast({ title: 'Template saved', description: `"${name}" has been saved` });
    fetchTemplates();
    return data;
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Failed to delete template', description: error.message });
      return false;
    }

    toast({ title: 'Template deleted' });
    fetchTemplates();
    return true;
  };

  return {
    templates,
    loading,
    saveTemplate,
    deleteTemplate,
    refreshTemplates: fetchTemplates
  };
}
