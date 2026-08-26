import { Plus } from 'lucide-react';
import { COMPONENT_CATEGORIES, type ComponentCategory } from './builderCatalog';
import { checkCompatibility, type BuildSelection } from './compatibility';
import { formatTaka } from './buildConfig';

interface PartsTableProps {
  build: BuildSelection;
  onOpenCategory: (category: ComponentCategory) => void;
  onRemove: (category: ComponentCategory) => void;
}

export default function PartsTable({ build, onOpenCategory, onRemove }: PartsTableProps) {
  const total = Object.values(build).reduce((sum, p) => sum + (p?.price ?? 0), 0);

  return (
    <div className="glass-card parts-table-card">
      <table className="parts-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Product</th>
            <th>Key Spec</th>
            <th>Price</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {COMPONENT_CATEGORIES.map((meta) => {
            const product = build[meta.id];
            const compat = product ? checkCompatibility(product, build) : null;
            return (
              <tr key={meta.id}>
                <td className="parts-table-category">{meta.label}</td>
                {product && compat ? (
                  <>
                    <td className="parts-table-name">{product.name}</td>
                    <td className="parts-table-spec">{product.keySpec}</td>
                    <td className="parts-table-price">{formatTaka(product.price)}</td>
                    <td>
                      <span className={`compat-badge compat-${compat.status}`}>
                        {compat.message}
                      </span>
                      <span className="parts-table-actions">
                        <button type="button" onClick={() => onOpenCategory(meta.id)}>
                          Change
                        </button>
                        <button
                          type="button"
                          className="is-danger"
                          onClick={() => onRemove(meta.id)}
                        >
                          Remove
                        </button>
                      </span>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="parts-table-empty" colSpan={3}>
                      Not selected
                    </td>
                    <td>
                      <button
                        type="button"
                        className="parts-table-add"
                        onClick={() => onOpenCategory(meta.id)}
                      >
                        <Plus size={13} /> Add
                      </button>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>Total</td>
            <td className="parts-table-total" colSpan={2}>
              {formatTaka(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
