import { useState, type FormEvent } from 'react'

import { FieldError } from '@/components/FieldError'
import { KindRadioGroup } from '@/components/KindRadioGroup'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, apiRequest, type FieldErrors } from '@/lib/api'
import type { Category, Kind } from '@/lib/types'

type CategoryFormDialogProps = {
  open: boolean
  category: Category | null
  defaultKind: Kind
  onClose: () => void
  onSaved: (category: Category) => void
}

export function CategoryFormDialog({ open, category, defaultKind, onClose, onSaved }: CategoryFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        {/* A chave recria o formulário a cada abertura, já com os dados da categoria escolhida. */}
        {open && (
          <CategoryForm
            key={category?.id ?? 'nova'}
            category={category}
            defaultKind={defaultKind}
            onClose={onClose}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function CategoryForm({ category, defaultKind, onClose, onSaved }: Omit<CategoryFormDialogProps, 'open'>) {
  const [name, setName] = useState(category?.name ?? '')
  const [kind, setKind] = useState<Kind>(category?.kind ?? defaultKind)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setErrors({ name: ['Informe o nome da categoria.'] })
      return
    }
    setSaving(true)
    setErrors({})
    setFormError('')
    try {
      const saved = await apiRequest<Category>(category ? `/api/categories/${category.id}/` : '/api/categories/', {
        method: category ? 'PATCH' : 'POST',
        body: { name: name.trim(), kind },
      })
      onSaved(saved)
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length) {
        setErrors(error.fieldErrors)
      } else {
        setFormError(error instanceof ApiError ? error.message : 'Não foi possível salvar a categoria.')
      }
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle className="text-xl">{category ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
        <DialogDescription>As categorias organizam os lançamentos e aparecem no relatório (DRE).</DialogDescription>
      </DialogHeader>

      {formError && (
        <Alert variant="destructive">
          <AlertDescription className="text-base">{formError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="category-name">Nome</Label>
        <Input
          id="category-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? 'category-name-erro' : undefined}
          autoFocus
        />
        <FieldError id="category-name-erro" messages={errors.name} />
      </div>

      <KindRadioGroup
        name="category-kind"
        value={kind}
        onChange={setKind}
        disabled={Boolean(category)}
        hint={category ? 'O tipo não pode ser alterado depois de criada a categoria.' : undefined}
      />
      <FieldError id="category-kind-erro" messages={errors.kind} />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </DialogFooter>
    </form>
  )
}
