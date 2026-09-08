import { Save } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Input, Modal } from '../ui';

interface SaveBuildModalProps {
  open: boolean;
  /** Pre-filled suggestion; submitting it unchanged (or blank) keeps the auto-name. */
  defaultName: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

export default function SaveBuildModal({
  open,
  defaultName,
  onClose,
  onSave,
}: SaveBuildModalProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(name.trim() || defaultName);
      setName('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Save build" closeLabel="Close">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Input
          label="Build name"
          placeholder={defaultName}
          value={name}
          maxLength={80}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          hint="Leave blank to use the suggested name."
        />
        <div className="flex justify-end gap-3">
          <button type="button" className="button-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="button-primary" disabled={saving}>
            <Save size={15} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
