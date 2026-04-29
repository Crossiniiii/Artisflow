import { supabase } from '../supabase';
import { mapToSnakeCase } from '../utils/supabaseUtils';
import { IS_DEMO_MODE } from '../constants';
import { useData } from '../contexts/DataContext';
import { useNotifications } from './useNotifications';
import { useUI } from '../contexts/UIContext';
import { uploadBase64ToStorage } from '../services/supabaseStorageService';

export const useBranchOperations = () => {
  const { 
    branches, setBranches, 
    branchAddresses, setBranchAddresses, 
    branchCategories, setBranchCategories,
    branchLogos, setBranchLogos,
    exclusiveBranches, setExclusiveBranches,
    setArtworks,
    setEvents
  } = useData();
  
  const { pushNotification } = useNotifications();
  const { setImportStatus } = useUI();

  const handleAddBranch = async (name: string, isExclusive: boolean = false, category?: string, logoUrl?: string) => {
    if (branches.includes(name)) return;
    
    setImportStatus({
      isVisible: true,
      title: 'Adding Branch',
      message: `Creating branch "${name}"...`
    });

    try {
      const finalLogoUrl = await uploadBase64ToStorage(logoUrl, 'images', 'branches') || logoUrl;
      setBranches(prev => [...prev, name]);
      if (category) setBranchCategories(prev => ({ ...prev, [name]: category }));
      if (finalLogoUrl) setBranchLogos(prev => ({ ...prev, [name]: finalLogoUrl }));
      if (isExclusive) setExclusiveBranches(prev => [...prev, name]);
      
      if (!IS_DEMO_MODE) {
        const { error } = await supabase.from('branches').insert(mapToSnakeCase({
            name,
            isExclusive: isExclusive,
            category,
            logoUrl: finalLogoUrl
        }));
        if (error) throw error;
      }
      pushNotification('Branch Added', name, 'system');
    } catch (error) {
      console.error('Add Branch Error:', error);
      pushNotification('Error Adding Branch', 'Could not save to database.', 'system');
    } finally {
      setTimeout(() => setImportStatus({ isVisible: false }), 500);
    }
  };

  const handleUpdateBranch = async (oldName: string, newName: string, category?: string, address?: string, logoUrl?: string) => {
    setImportStatus({ isVisible: true, title: 'Updating Branch', message: 'Syncing...', progress: { current: 0, total: 100 } });

    const isRename = oldName !== newName;
    const finalCategory = category || branchCategories[oldName] || 'Gallery';
    const finalAddress = address || branchAddresses[oldName] || '';
    const preparedLogoUrl = logoUrl || branchLogos[oldName] || '';
    const isExclusive = exclusiveBranches.includes(oldName);

    if (IS_DEMO_MODE) {
        const finalLogoUrl = preparedLogoUrl;
        if (isRename) setBranches(prev => [...prev.filter(b => b !== oldName), newName]);
        setBranchAddresses(prev => ({ ...prev, [newName]: finalAddress }));
        setBranchCategories(prev => ({ ...prev, [newName]: finalCategory }));
        setBranchLogos(prev => ({ ...prev, [newName]: finalLogoUrl }));
        setImportStatus({ isVisible: false });
        return;
    }

    try {
        const finalLogoUrl = await uploadBase64ToStorage(preparedLogoUrl, 'images', 'branches') || preparedLogoUrl;
        // 1. Upsert new branch record (or update if same name)
        const { error: branchError } = await supabase.from('branches').upsert(mapToSnakeCase({
            name: newName,
            address: finalAddress,
            category: finalCategory,
            logoUrl: finalLogoUrl,
            isExclusive: isExclusive
        }));
        if (branchError) throw branchError;

        if (isRename) {
            // 2. Update Artworks
            const { error: artError } = await supabase.from('artworks').update(mapToSnakeCase({ currentBranch: newName })).eq('current_branch', oldName);
            if (artError) throw artError;

            // 3. Update Events
            const { error: eventError } = await supabase.from('events').update({ location: newName }).eq('location', oldName);
            if (eventError) throw eventError;

            // 4. Delete Old Branch
            await supabase.from('branches').delete().eq('name', oldName);

            setBranches(prev => [...prev.filter(b => b !== oldName), newName]);
            setArtworks(prev => prev.map(a => a.currentBranch === oldName ? { ...a, currentBranch: newName } : a));
            setEvents(prev => prev.map(e => e.location === oldName ? { ...e, location: newName } : e));
        }

        setBranchAddresses(prev => ({ ...prev, [newName]: finalAddress }));
        setBranchCategories(prev => ({ ...prev, [newName]: finalCategory }));
        setBranchLogos(prev => ({ ...prev, [newName]: finalLogoUrl }));
        
        pushNotification('Branch Updated', newName, 'system');
    } catch (error: any) {
        console.error('Supabase Update Branch Error:', error);
    } finally {
        setImportStatus({ isVisible: false });
    }
  };

  const handleDeleteBranch = async (name: string) => {
    if (!window.confirm(`Are you sure you want to delete branch "${name}"?`)) return;

    setImportStatus({
      isVisible: true,
      title: 'Deleting Branch',
      message: `Removing branch "${name}" from database...`
    });

    try {
      if (!IS_DEMO_MODE) {
        // Use .select() to force Supabase to return the deleted row. If it's empty, RLS naturally blocked the action.
        const { data, error } = await supabase.from('branches').delete().eq('name', name).select();
        
        if (error) {
            console.error('SUPABASE DELETE ERROR:', error);
            alert(`Could not delete branch: ${error.message}\nThis usually happens if there are artworks or events still linked to this branch.`);
            throw error;
        }

        if (!data || data.length === 0) {
            const msg = `Deletion was silently blocked by the database. This usually means Row Level Security (RLS) policies on the 'branches' table are missing a DELETE policy. Please check Supabase dashboard.`;
            console.error('RLS BLOCK:', msg);
            alert(msg);
            throw new Error(msg);
        }
      }

      setBranches(prev => prev.filter(b => b !== name));
      pushNotification('Branch Removed', name, 'system');
    } catch (error) {
      console.error('Delete Branch Error:', error);
      pushNotification('Error Removing Branch', 'Record could not be deleted.', 'system');
    } finally {
      setTimeout(() => setImportStatus({ isVisible: false }), 500);
    }
  };

  const handleUpdateBranchAddress = async (name: string, address: string) => {
    setBranchAddresses(prev => ({ ...prev, [name]: address }));
    if (IS_DEMO_MODE) return;
    try {
      await supabase.from('branches').update({ address }).eq('name', name);
    } catch (error) {
      console.error('Error updating branch address', error);
    }
  };

  return {
    handleAddBranch,
    handleUpdateBranch,
    handleDeleteBranch,
    handleUpdateBranchAddress
  };
};
