import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Clock, FileText, BookTemplate, Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';

interface Analysis {
  id: string;
  name: string;
  status: string;
  sequence_count: number;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  selected_panels: string[];
  created_at: string;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  
  const [displayName, setDisplayName] = useState('');
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchAnalyses();
      fetchTemplates();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user!.id)
      .maybeSingle();
    
    if (data?.display_name) {
      setDisplayName(data.display_name);
    }
  };

  const fetchAnalyses = async () => {
    const { data } = await supabase
      .from('analyses')
      .select('id, name, status, sequence_count, created_at')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    setAnalyses(data || []);
  };

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('templates')
      .select('id, name, description, selected_panels, created_at')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    
    setTemplates(data || []);
    setLoading(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('user_id', user!.id);
    
    setSaving(false);
    
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save profile' });
    } else {
      toast({ title: 'Saved', description: 'Profile updated successfully' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-primary/20 text-primary';
      case 'computing': return 'bg-secondary/20 text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your account and view your work</p>
        </div>
        
        <Tabs defaultValue="account" className="space-y-6">
          <TabsList>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Account
            </TabsTrigger>
            <TabsTrigger value="analyses" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Analyses
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <BookTemplate className="h-4 w-4" />
              Templates
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="account">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Update your profile information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{user?.email}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                
                <Button onClick={saveProfile} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analyses">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Recent Analyses</CardTitle>
                <CardDescription>Your saved sequence analyses</CardDescription>
              </CardHeader>
              <CardContent>
                {analyses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>No analyses yet</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate('/new-analysis')}>
                      Start Your First Analysis
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analyses.map((analysis) => (
                      <div
                        key={analysis.id}
                        className="flex items-center justify-between p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/analysis/${analysis.id}`)}
                      >
                        <div>
                          <h4 className="font-medium">{analysis.name}</h4>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span>{analysis.sequence_count} sequences</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(analysis.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Badge className={getStatusColor(analysis.status)}>
                          {analysis.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="templates">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Saved Templates</CardTitle>
                <CardDescription>Reusable analysis configurations</CardDescription>
              </CardHeader>
              <CardContent>
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookTemplate className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>No templates saved</p>
                    <p className="text-sm mt-1">Save templates during analysis setup</p>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="p-4 bg-muted/20 rounded-lg border border-border/50"
                      >
                        <h4 className="font-medium">{template.name}</h4>
                        {template.description && (
                          <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.selected_panels.slice(0, 3).map((panel) => (
                            <Badge key={panel} variant="outline" className="text-xs">
                              {panel}
                            </Badge>
                          ))}
                          {template.selected_panels.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.selected_panels.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Profile;
