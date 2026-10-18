/** Mensagem de erro de um campo do formulário, ligada ao campo via aria-describedby. */
export function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) {
    return null
  }
  return (
    <p id={id} className="text-base text-destructive">
      {messages.join(' ')}
    </p>
  )
}
