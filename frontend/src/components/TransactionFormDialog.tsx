import { useState, type FormEvent } from 'react'

import { FieldError } from '@/components/FieldError'
import { KindRadioGroup } from '@/components/KindRadioGroup'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ApiError, apiRequest, type FieldErrors } from '@/lib/api'
import { parseMoneyInput, toMoneyInput, todayIso } from '@/lib/format'
import type { Category, Kind, Transaction } from '@/lib/types'

type TransactionFormDialogProps = {
  open: boolean
  transaction: Transaction | null
  categories: Category[]
  onClose: () => void
  onSaved: (transaction: Transaction) => void
}

export function TransactionFormDialog({ open, transaction, categories, onClose, onSaved }: TransactionFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        {open && (
          <TransactionForm
            key={transaction?.id ?? 'novo'}
            transaction={transaction}
            categories={categories}
            onClose={onClose}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function fieldProps(errors: FieldErrors, field: string) {
  return {
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `transaction-${field}-erro` : undefined,
  }
}

function TransactionForm({ transaction, categories, onClose, onSaved }: Omit<TransactionFormDialogProps, 'open'>) {
  const [date, setDate] = useState(transaction?.date ?? todayIso())
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [amount, setAmount] = useState(transaction ? toMoneyInput(transaction.amount) : '')
  const [kind, setKind] = useState<Kind>(transaction?.kind ?? 'income')
  const [category, setCategory] = useState(transaction?.category ? String(transaction.category) : '')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // Mostra só as categorias ativas do tipo escolhido, mantendo a categoria atual
  // do lançamento mesmo que ela tenha sido desativada depois.
  const options = categories.filter(
    (item) => item.kind === kind && (item.is_active || String(item.id) === category),
  )

  function changeKind(newKind: Kind) {
    setKind(newKind)
    if (category && !categories.some((item) => String(item.id) === category && item.kind === newKind)) {
      setCategory('')
    }
  }

  function validate() {
    const found: FieldErrors = {}
    if (!date) found.date = ['Informe a data do lançamento.']
    if (!description.trim()) found.description = ['Informe uma descrição.']
    const parsed = parseMoneyInput(amount)
    if (parsed === null) found.amount = ['Informe um valor válido, por exemplo 1.250,00.']
    else if (Number(parsed) <= 0) found.amount = ['O valor deve ser maior que zero.']
    return { found, parsed }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const { found, parsed } = validate()
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length) {
      return
    }
    setSaving(true)
    try {
      const saved = await apiRequest<Transaction>(transaction ? `/api/transactions/${transaction.id}/` : '/api/transactions/', {
        method: transaction ? 'PATCH' : 'POST',
        body: {
          date,
          description: description.trim(),
          amount: parsed,
          kind,
          category: category ? Number(category) : null,
        },
      })
      onSaved(saved)
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length) {
        setErrors(error.fieldErrors)
      } else {
        setFormError(error instanceof ApiError ? error.message : 'Não foi possível salvar o lançamento.')
      }
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle className="text-xl">{transaction ? 'Editar lançamento' : 'Novo lançamento'}</DialogTitle>
        <DialogDescription>Registre uma entrada (rendimento) ou saída (pagamento) de dinheiro da igreja.</DialogDescription>
      </DialogHeader>

      {formError && (
        <Alert variant="destructive">
          <AlertDescription className="text-base">{formError}</AlertDescription>
        </Alert>
      )}

      <KindRadioGroup name="transaction-kind" value={kind} onChange={changeKind} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="transaction-date">Data</Label>
          <Input
            id="transaction-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            {...fieldProps(errors, 'date')}
          />
          <FieldError id="transaction-date-erro" messages={errors.date} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="transaction-amount">Valor (R$)</Label>
          <Input
            id="transaction-amount"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            {...fieldProps(errors, 'amount')}
          />
          <FieldError id="transaction-amount-erro" messages={errors.amount} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="transaction-description">Descrição</Label>
        <Input
          id="transaction-description"
          value={description}
          maxLength={255}
          onChange={(event) => setDescription(event.target.value)}
          {...fieldProps(errors, 'description')}
        />
        <FieldError id="transaction-description-erro" messages={errors.description} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="transaction-category">Categoria</Label>
        <NativeSelect
          id="transaction-category"
          className="w-full"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          {...fieldProps(errors, 'category')}
        >
          <NativeSelectOption value="">Sem categoria</NativeSelectOption>
          {options.map((item) => (
            <NativeSelectOption key={item.id} value={String(item.id)}>
              {item.name}
              {item.is_active ? '' : ' (inativa)'}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldError id="transaction-category-erro" messages={errors.category} />
      </div>

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
