'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  KeyIcon,
  Plus,
  Copy,
  MoreHorizontal,
  Eye,
  EyeOff,
  Trash2,
  Calendar,
  Shield,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  createAdminApiKey,
  listAdminApiKeys,
  updateAdminApiKey,
  deleteAdminApiKey,
} from '@/actions/admin/api-keys';

interface ApiKey {
  id: string;
  name: string;
  start: string;
  enabled: boolean;
  expiresAt: string | null;
  createdAt: string;
  lastRequest: string | null;
  requestCount: number;
  remaining: number | null;
  metadata: any;
}

export function ApiKeyManagement() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [showKey, setShowKey] = useState<string | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    expiresIn: 365, // days
    purpose: '',
    owner: '',
  });

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const result = await listAdminApiKeys();

      if (result.success) {
        // setApiKeys(result.data);
      } else {
        toast.error(result.error || 'Failed to load API keys');
      }
    } catch (error) {
      toast.error('Failed to load API keys');
      console.error('Error loading API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApiKeys();
  }, []);

  const handleCreateApiKey = async () => {
    try {
      if (!createForm.name.trim()) {
        toast.error('Please enter a name for the API key');
        return;
      }

      const result = await createAdminApiKey({
        name: createForm.name,
        expiresIn: createForm.expiresIn,
        metadata: {
          purpose: createForm.purpose || 'admin-access',
          owner: createForm.owner || 'admin',
        },
      });

      if (result.success) {
        toast.success('API key created successfully');
        setShowKey(result.data.key); // Show the generated key
        setCreateModalOpen(false);
        setCreateForm({ name: '', expiresIn: 365, purpose: '', owner: '' });
        loadApiKeys();
      } else {
        toast.error(result.error || 'Failed to create API key');
      }
    } catch (error) {
      toast.error('Failed to create API key');
      console.error('Error creating API key:', error);
    }
  };

  const handleToggleKey = async (keyId: string, enabled: boolean) => {
    try {
      const result = await updateAdminApiKey(keyId, { enabled });

      if (result.success) {
        toast.success(`API key ${enabled ? 'enabled' : 'disabled'}`);
        loadApiKeys();
      } else {
        toast.error(result.error || 'Failed to update API key');
      }
    } catch (error) {
      toast.error('Failed to update API key');
      console.error('Error updating API key:', error);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      const result = await deleteAdminApiKey(keyId);

      if (result.success) {
        toast.success('API key deleted successfully');
        loadApiKeys();
      } else {
        toast.error(result.error || 'Failed to delete API key');
      }
    } catch (error) {
      toast.error('Failed to delete API key');
      console.error('Error deleting API key:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getStatusBadge = (key: ApiKey) => {
    if (!key.enabled) {
      return <Badge variant='secondary'>Disabled</Badge>;
    }
    if (isExpired(key.expiresAt)) {
      return <Badge variant='destructive'>Expired</Badge>;
    }
    return <Badge variant='default'>Active</Badge>;
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>
            API Key Management
          </h2>
          <p className='text-muted-foreground'>
            Manage admin API keys for secure access to the admin panel
          </p>
        </div>
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className='mr-2 h-4 w-4' />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle>Create Admin API Key</DialogTitle>
              <DialogDescription>
                Generate a new API key for admin panel access. Keys expire after
                the specified duration.
              </DialogDescription>
            </DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='space-y-2'>
                <Label htmlFor='name'>Key Name *</Label>
                <Input
                  id='name'
                  placeholder='e.g., Client Admin Access'
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='expiresIn'>Expires In</Label>
                <Select
                  value={createForm.expiresIn.toString()}
                  onValueChange={(value) =>
                    setCreateForm({ ...createForm, expiresIn: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='30'>30 days</SelectItem>
                    <SelectItem value='90'>90 days</SelectItem>
                    <SelectItem value='180'>6 months</SelectItem>
                    <SelectItem value='365'>1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='purpose'>Purpose</Label>
                <Input
                  id='purpose'
                  placeholder='e.g., Admin panel access'
                  value={createForm.purpose}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, purpose: e.target.value })
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='owner'>Owner</Label>
                <Input
                  id='owner'
                  placeholder='e.g., Client name'
                  value={createForm.owner}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, owner: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateApiKey}>Create Key</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Environment Variables Info */}
      <Alert>
        <Shield className='h-4 w-4' />
        <AlertDescription>
          <strong>Environment Variables:</strong> You can also set{' '}
          <code>ADMIN_API_KEYS</code> in your environment for fallback access.
          Database keys provide better management and audit capabilities.
        </AlertDescription>
      </Alert>

      {/* New Key Display */}
      {showKey && (
        <Alert className='border-green-200 bg-green-50'>
          <KeyIcon className='h-4 w-4' />
          <AlertDescription>
            <div className='space-y-2'>
              <p className='font-medium text-green-800'>
                API Key Created Successfully!
              </p>
              <div className='flex items-center gap-2'>
                <code className='bg-white px-2 py-1 rounded text-sm font-mono text-green-900 border'>
                  {showKey}
                </code>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => copyToClipboard(showKey)}
                  className='h-8'
                >
                  <Copy className='h-3 w-3' />
                </Button>
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={() => setShowKey(null)}
                  className='h-8'
                >
                  <EyeOff className='h-3 w-3' />
                </Button>
              </div>
              <p className='text-xs text-green-700'>
                Save this key securely. You won't be able to see it again!
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* API Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle>Admin API Keys</CardTitle>
          <CardDescription>
            All API keys with admin permissions for accessing the admin panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='flex items-center justify-center py-8'>
              <div className='text-center'>
                <KeyIcon className='mx-auto h-8 w-8 text-muted-foreground mb-2' />
                <p className='text-muted-foreground'>Loading API keys...</p>
              </div>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className='flex items-center justify-center py-8'>
              <div className='text-center'>
                <KeyIcon className='mx-auto h-8 w-8 text-muted-foreground mb-2' />
                <p className='text-muted-foreground'>No API keys found</p>
                <p className='text-sm text-muted-foreground'>
                  Create your first admin API key to get started
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key Preview</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>
                      <div>
                        <div className='font-medium'>{key.name}</div>
                        {key.metadata?.owner && (
                          <div className='text-sm text-muted-foreground'>
                            Owner: {key.metadata.owner}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className='text-xs bg-muted px-2 py-1 rounded'>
                        {key.start}...
                      </code>
                    </TableCell>
                    <TableCell>{getStatusBadge(key)}</TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1 text-sm'>
                        <Calendar className='h-3 w-3' />
                        {formatDate(key.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {key.expiresAt ? (
                        <div
                          className={`flex items-center gap-1 text-sm ${isExpired(key.expiresAt) ? 'text-destructive' : ''}`}
                        >
                          <Clock className='h-3 w-3' />
                          {formatDate(key.expiresAt)}
                        </div>
                      ) : (
                        <span className='text-sm text-muted-foreground'>
                          Never
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className='text-sm'>
                        <div>{key.requestCount} requests</div>
                        {key.lastRequest && (
                          <div className='text-muted-foreground'>
                            Last: {formatDate(key.lastRequest)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='text-right'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' className='h-8 w-8 p-0'>
                            <span className='sr-only'>Open menu</span>
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() =>
                              handleToggleKey(key.id, !key.enabled)
                            }
                          >
                            {key.enabled ? 'Disable' : 'Enable'} Key
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteKey(key.id)}
                            className='text-destructive'
                          >
                            <Trash2 className='mr-2 h-4 w-4' />
                            Delete Key
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
