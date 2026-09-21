// New Matter dialog. Creates a session overlay record (no server write).

import { useState, useCallback, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import {
  DialogComponent,
} from '@syncfusion/ej2-react-popups';
import { FormValidator, type FormValidatorModel } from '@syncfusion/ej2-inputs';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { NumericTextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { DatePickerComponent } from '@syncfusion/ej2-react-calendars';
import { RadioButtonComponent } from '@syncfusion/ej2-react-buttons';
import { UploaderComponent } from '@syncfusion/ej2-react-inputs';
import { ToastUtility } from '@syncfusion/ej2-react-notifications';
import type { LookupItem } from '../../models/api';

export interface NewMatterFormValues {
  title: string;
  practiceArea: string;
  responsibleAttorney: string;
  firm: string;
  budgetAmount: number;
  openDate: Date;
  riskLevel: string;
}

interface NewMatterDialogProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (values: NewMatterFormValues) => void;
  /** Dropdown options from the parent page. */
  practiceAreas: LookupItem[];
  staff: LookupItem[];
  firms: LookupItem[];
}

interface Ej2Host extends HTMLElement {
  ej2_instances?: Array<{ value?: unknown }>;
}

function readEj2Value(element: HTMLElement): unknown {
  return (element as Ej2Host).ej2_instances?.[0]?.value;
}

function hasSelection(args: { element: HTMLElement; value: string }): boolean {
  const ej2 = readEj2Value(args.element);
  if (typeof ej2 === 'string') return ej2.trim().length > 0;
  if (ej2 != null && ej2 !== '') return true;
  return Boolean(args.value?.toString().trim());
}

function hasBudget(args: { element: HTMLElement; value: string }): boolean {
  const ej2 = readEj2Value(args.element);
  const numeric = typeof ej2 === 'number' ? ej2 : Number.parseFloat(String(args.value).replace(/[^0-9.-]/g, ''));
  return typeof numeric === 'number' && !Number.isNaN(numeric) && numeric >= 0;
}

function hasDate(args: { element: HTMLElement; value: string }): boolean {
  const ej2 = readEj2Value(args.element);
  if (ej2 instanceof Date) return !Number.isNaN(ej2.getTime());
  if (!args.value) return false;
  return !Number.isNaN(Date.parse(args.value));
}

function placeError(inputElement: HTMLElement, errorElement: HTMLElement): void {
  const field = inputElement.closest('.form-field');
  const slot = field?.querySelector('.form-error');
  if (slot) {
    slot.replaceChildren(errorElement);
    return;
  }
  field?.appendChild(errorElement);
}

const FORM_VALIDATOR_OPTIONS: FormValidatorModel = {
  customPlacement: placeError,
  rules: {
    title: {
      required: [true, 'Matter title is required'],
      minLength: [3, 'Enter at least 3 characters'],
    },
    practiceArea: {
      required: [hasSelection, 'Select a practice area'],
    },
    responsibleAttorney: {
      required: [hasSelection, 'Select a responsible attorney'],
    },
    budgetAmount: {
      minValue: [hasBudget, 'Enter a budget of $0.00 or more'],
    },
    openDate: {
      required: [hasDate, 'Open date is required'],
    },
    riskLevel: {
      required: [true, 'Select a risk level'],
    },
  },
};

export function NewMatterDialog({
  visible,
  onClose,
  onCreate,
  practiceAreas,
  staff,
  firms,
}: NewMatterDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const validatorRef = useRef<FormValidator | null>(null);
  const [title, setTitle] = useState('');
  const [practiceArea, setPracticeArea] = useState('');
  const [attorney, setAttorney] = useState('');
  const [firm, setFirm] = useState('');
  const [budget, setBudget] = useState<number>(0);
  const [openDate, setOpenDate] = useState<Date>(new Date());
  const [riskLevel, setRiskLevel] = useState('Medium');

  const resetForm = useCallback(() => {
    setTitle('');
    setPracticeArea('');
    setAttorney('');
    setFirm('');
    setBudget(0);
    setOpenDate(new Date());
    setRiskLevel('Medium');
  }, []);

  const initValidator = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    if (validatorRef.current) {
      validatorRef.current.reset();
      return;
    }
    validatorRef.current = new FormValidator(form, FORM_VALIDATOR_OPTIONS);
  }, []);

  useEffect(() => {
    return () => {
      validatorRef.current?.reset();
      validatorRef.current?.destroy();
      validatorRef.current = null;
    };
  }, []);

  const revalidate = useCallback((name: string) => {
    validatorRef.current?.validate(name);
  }, []);

  const handleCreate = useCallback(() => {
    if (!validatorRef.current) {
      initValidator();
    }
    if (!validatorRef.current?.validate()) return;
    onCreate({
      title: title.trim(),
      practiceArea,
      responsibleAttorney: attorney,
      firm,
      budgetAmount: budget,
      openDate,
      riskLevel,
    });
    resetForm();
    onClose();
    ToastUtility.show({
      content: 'Matter created successfully.',
      cssClass: 'e-toast-success',
      icon: 'e-toast-success-icon',
      timeOut: 4000,
      position: { X: 'Right', Y: 'Top' },
      showCloseButton: true,
      newestOnTop: true,
    });
  }, [title, practiceArea, attorney, firm, budget, openDate, riskLevel, onCreate, resetForm, onClose, initValidator]);

  const handleClose = useCallback(() => {
    validatorRef.current?.reset();
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleCreate();
  }, [handleCreate]);

  const paFields = { text: 'name', value: 'code' };
  const staffFields = { text: 'name', value: 'code' };
  const firmFields = { text: 'name', value: 'code' };
  const paData = practiceAreas as unknown as { [key: string]: Object }[];
  const staffData = staff as unknown as { [key: string]: Object }[];
  const firmData = firms as unknown as { [key: string]: Object }[];

  return (
    <DialogComponent
      visible={visible}
      header="New Matter"
      width="720px"
      showCloseIcon={true}
      open={initValidator}
      close={handleClose}
      isModal={true}
      animationSettings={{ effect: 'Zoom' }}
      cssClass="new-matter-dialog"
      buttons={[
        { click: handleClose, buttonModel: { content: 'Cancel', cssClass: 'e-flat' } },
        {
          click: handleCreate,
          buttonModel: { content: 'Create', isPrimary: true },
        },
      ]}
    >
      <form
        id="new-matter-form"
        ref={formRef}
        className="new-matter-form"
        noValidate
        onSubmit={handleSubmit}
      >
        <div className="form-field form-field--full">
          <label className="form-label" htmlFor="new-matter-title">Matter Title *</label>
          <TextBoxComponent
            id="new-matter-title"
            name="title"
            placeholder="e.g. Acme Corp v. TechCo — patent infringement"
            value={title}
            width="100%"
            htmlAttributes={{ name: 'title', 'data-msg-containerid': 'new-matter-title-error' }}
            input={(e) => {
              setTitle(e.value ?? '');
              revalidate('title');
            }}
            change={(e) => {
              setTitle(e.value ?? '');
              revalidate('title');
            }}
          />
          <div id="new-matter-title-error" className="form-error" />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="new-matter-practice-area">Practice Area *</label>
          <DropDownListComponent
            id="new-matter-practice-area"
            dataSource={paData}
            fields={paFields}
            placeholder="Select practice area"
            value={practiceArea}
            cssClass="new-matter-input"
            width="100%"
            popupWidth="100%"
            htmlAttributes={{ name: 'practiceArea', 'data-msg-containerid': 'new-matter-practice-area-error' }}
            change={(e) => {
              setPracticeArea(e.itemData?.code ?? '');
              revalidate('practiceArea');
            }}
          />
          <div id="new-matter-practice-area-error" className="form-error" />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="new-matter-attorney">Responsible Attorney *</label>
          <DropDownListComponent
            id="new-matter-attorney"
            dataSource={staffData}
            fields={staffFields}
            placeholder="Select attorney"
            value={attorney}
            cssClass="new-matter-input"
            width="100%"
            popupWidth="100%"
            htmlAttributes={{ name: 'responsibleAttorney', 'data-msg-containerid': 'new-matter-attorney-error' }}
            change={(e) => {
              setAttorney(e.itemData?.code ?? '');
              revalidate('responsibleAttorney');
            }}
          />
          <div id="new-matter-attorney-error" className="form-error" />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="new-matter-firm">Law Firm</label>
          <DropDownListComponent
            id="new-matter-firm"
            dataSource={firmData}
            fields={firmFields}
            placeholder="Outside counsel (optional)"
            value={firm}
            cssClass="new-matter-input"
            width="100%"
            popupWidth="100%"
            htmlAttributes={{ name: 'firm' }}
            change={(e) => setFirm(e.itemData?.code ?? '')}
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="new-matter-budget">Budget Amount *</label>
          <NumericTextBoxComponent
            id="new-matter-budget"
            format="C2"
            min={0}
            step={1000}
            placeholder="$0.00"
            value={budget}
            width="100%"
            htmlAttributes={{ name: 'budgetAmount', 'data-msg-containerid': 'new-matter-budget-error' }}
            change={(e) => {
              setBudget(e.value ?? 0);
              revalidate('budgetAmount');
            }}
          />
          <div id="new-matter-budget-error" className="form-error" />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="new-matter-open-date">Open Date *</label>
          <DatePickerComponent
            id="new-matter-open-date"
            value={openDate}
            format="MM/dd/yyyy"
            width="100%"
            htmlAttributes={{ name: 'openDate', 'data-msg-containerid': 'new-matter-open-date-error' }}
            change={(e) => {
              if (e.value) setOpenDate(e.value);
              revalidate('openDate');
            }}
          />
          <div id="new-matter-open-date-error" className="form-error" />
        </div>
        <div className="form-field">
          <span className="form-label" id="new-matter-risk-label">Risk Level *</span>
          <div className="radio-group" role="radiogroup" aria-labelledby="new-matter-risk-label">
            <RadioButtonComponent
              name="riskLevel"
              label="Low"
              value="Low"
              checked={riskLevel === 'Low'}
              htmlAttributes={{ 'data-msg-containerid': 'new-matter-risk-error' }}
              change={() => {
                setRiskLevel('Low');
                revalidate('riskLevel');
              }}
            />
            <RadioButtonComponent
              name="riskLevel"
              label="Medium"
              value="Medium"
              checked={riskLevel === 'Medium'}
              change={() => {
                setRiskLevel('Medium');
                revalidate('riskLevel');
              }}
            />
            <RadioButtonComponent
              name="riskLevel"
              label="High"
              value="High"
              checked={riskLevel === 'High'}
              change={() => {
                setRiskLevel('High');
                revalidate('riskLevel');
              }}
            />
          </div>
          <div id="new-matter-risk-error" className="form-error" />
        </div>

        <div className="form-field form-field--full">
          <label className="form-label" htmlFor="new-matter-documents">Supporting Documents</label>
          <UploaderComponent
            id="new-matter-documents"
            multiple={true}
            autoUpload={false}
            allowedExtensions=".pdf,.docx,.doc"
            showFileList={true}
          />
          <span className="form-hint">PDF and DOCX supported.</span>
        </div>
      </form>
    </DialogComponent>
  );
}

export default NewMatterDialog;
