import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useExchangeStore } from '../../store/useExchangeStore';
import { useCashRegisterStore } from '../../store/useCashRegisterStore';
import { usePOSTerminalStore } from '../../store/usePOSTerminalStore';
import { useCajaStore } from '../../store/useCajaStore';
import { Select } from '../../components/ui/Select';
import {
  Banknote,
  Coins,
  Plus,
  Printer,
  CheckCircle,
  AlertTriangle,
  Info,
  History,
  FileSpreadsheet,
  Search,
  Check,
  X,
  CreditCard,
  User,
  DollarSign,
  Store
} from 'lucide-react';
import Swal from 'sweetalert2';

const BANCOS_VENEZUELA = [
  'Banco de Venezuela (BDV)',
  'Banesco',
  'Banco Mercantil',
  'Banco Provincial (BBVA)',
  'Banco Nacional de Crédito (BNC)',
  'Bancamiga',
  'Banplus',
  'Banco Fondo Común (BFC)',
  'Banco Exterior',
  'Banco Plaza',
  'Banco Caroní',
  'Banco Activo',
  'Banco del Sur',
  'Banco Venezolano de Crédito',
  '100% Banco',
  'Banco del Tesoro',
  'Banco Agrícola de Venezuela',
  'Banco Bicentenario',
  'Mi Banco',
  'Bancrecer',
  'Citibank N.A. (Venezuela)'
];

export const CashClosure: React.FC = () => {
  const { company, user } = useAuthStore();
  const { currentRate } = useExchangeStore();
  const {
    activeClosure,
    vouchers,
    closures,
    openClosures,
    loading: cashLoading,
    setActiveClosure,
    checkActiveClosure,
    fetchOpenClosures,
    openRegister,
    fetchVouchers,
    addVoucher,
    consolidateVoucher,
    saveDraftClosure,
    processClosure,
    fetchClosuresHistory
  } = useCashRegisterStore();

  const {
    terminals,
    loading: posLoading,
    fetchTerminals,
    createTerminal,
    updateTerminal,
    deleteTerminal
  } = usePOSTerminalStore();

  const {
    cajas,
    loading: cajasLoading,
    fetchCajas,
    createCaja,
    updateCaja,
    deleteCaja
  } = useCajaStore();

  // Gestión de pestañas: 'arqueo' | 'vales' | 'historial' | 'pos'
  const [activeTab, setActiveTab] = useState<'arqueo' | 'vales' | 'historial' | 'pos'>('arqueo');

  // Estado para apertura de caja
  const [openingBalance, setOpeningBalance] = useState<string>('0');

  // Estado para Caja seleccionada en la apertura
  const [selectedCajaId, setSelectedCajaId] = useState<string>('');

  // Estados para el CRUD de Cajas
  const [isCajaModalOpen, setIsCajaModalOpen] = useState<boolean>(false);
  const [editingCaja, setEditingCaja] = useState<any | null>(null);
  const [cajaForm, setCajaForm] = useState({
    name: '',
    status: 'active' as 'active' | 'inactive'
  });

  // Denominaciones físicas USD
  const [usdDenoms, setUsdDenoms] = useState<{ [key: string]: number }>({
    '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '1': 0
  });

  // Denominaciones físicas VES
  const [vesDenoms, setVesDenoms] = useState<{ [key: string]: number }>({
    '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0
  });

  // Campos de Puntos de Venta (POS) declarados dinámicamente desde la BD (bimonetario bidireccional)
  const [posDeclarations, setPosDeclarations] = useState<{ [key: string]: { usd: string; ves: string } }>({});

  // Otros canales electrónicos y billeteras digitales (Pago Móvil, Zelle, Binance, Paypal, etc.)
  const [digitalWallets, setDigitalWallets] = useState<{ [key: string]: { usd: string; ves: string } }>({
    'Pago Móvil': { usd: '', ves: '' },
    'Transferencia Bancaria': { usd: '', ves: '' },
    'Zelle': { usd: '', ves: '' },
    'Binance': { usd: '', ves: '' },
    'Paypal': { usd: '', ves: '' }
  });

  // Datos financieros teóricos (Ventas totales ingresadas para cuadrar)
  const [salesSystemUsd, setSalesSystemUsd] = useState<number>(0);

  // Observaciones del cierre
  const [observations, setObservations] = useState<string>('');

  // Control de Modal de Nuevo Vale
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState<boolean>(false);
  const [voucherForm, setVoucherForm] = useState({
    employee_name: '',
    amount_usd: '',
    amount_ves: '',
    concept: ''
  });

  // Estado de vale por rendir (filtro)
  const [voucherFilter, setVoucherFilter] = useState<'all' | 'pending' | 'consolidated'>('all');

  // Estados para el CRUD de Puntos de Venta (POS)
  const [isPosModalOpen, setIsPosModalOpen] = useState<boolean>(false);
  const [editingPos, setEditingPos] = useState<any | null>(null);
  const [posForm, setPosForm] = useState({
    bank_name: '',
    terminal_name: '',
    serial_number: '',
    status: 'active' as 'active' | 'inactive'
  });

  // Estado para controlar el modal de Apertura de Turno de Caja
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState<boolean>(false);

  // Cargar datos al montar el componente
  useEffect(() => {
    if (company?.id && user?.id) {
      fetchOpenClosures(company.id);
      fetchVouchers(company.id);
      fetchClosuresHistory(company.id);
      fetchTerminals(company.id);
      fetchCajas(company.id);
    }
  }, [company?.id, user?.id]);

  // Sincronizar y restaurar reactivamente todo el estado de borrador cuando activeClosure cambie
  useEffect(() => {
    if (activeClosure) {
      setObservations(activeClosure.observations || '');
      setSalesSystemUsd(activeClosure.sales_system_usd || 0);

      // Restaurar denominaciones USD
      if (activeClosure.cash_count_details?.usd) {
        setUsdDenoms(activeClosure.cash_count_details.usd);
      } else {
        setUsdDenoms({ '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '1': 0 });
      }

      // Restaurar denominaciones VES
      if (activeClosure.cash_count_details?.ves) {
        setVesDenoms(activeClosure.cash_count_details.ves);
      } else {
        setVesDenoms({ '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0 });
      }

      // Restaurar desgloses de POS
      if (activeClosure.declared_pos_details && activeClosure.declared_pos_details.length > 0) {
        const posData: any = {};
        activeClosure.declared_pos_details.forEach((pos: any) => {
          posData[pos.terminal_name] = { usd: String(pos.usd || ''), ves: String(pos.ves || '') };
        });
        setPosDeclarations(posData);
      } else if (terminals.length > 0) {
        const activeTerms = terminals.filter(t => t.status === 'active');
        const initialPos: any = {};
        activeTerms.forEach(t => {
          initialPos[t.terminal_name] = { usd: '', ves: '' };
        });
        setPosDeclarations(initialPos);
      }

      // Restaurar billeteras digitales
      if (activeClosure.digital_wallets_details && Object.keys(activeClosure.digital_wallets_details).length > 0) {
        setDigitalWallets(activeClosure.digital_wallets_details);
      } else {
        setDigitalWallets({
          'Pago Móvil': { usd: '', ves: '' },
          'Transferencia Bancaria': { usd: '', ves: '' },
          'Zelle': { usd: '', ves: '' },
          'Binance': { usd: '', ves: '' },
          'Paypal': { usd: '', ves: '' }
        });
      }
    } else {
      // Si no hay caja seleccionada, resetear estados
      setObservations('');
      setSalesSystemUsd(0);
      setUsdDenoms({ '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '1': 0 });
      setVesDenoms({ '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0 });
      setDigitalWallets({
        'Pago Móvil': { usd: '', ves: '' },
        'Transferencia Bancaria': { usd: '', ves: '' },
        'Zelle': { usd: '', ves: '' },
        'Binance': { usd: '', ves: '' },
        'Paypal': { usd: '', ves: '' }
      });
      setPosDeclarations({});
    }
  }, [activeClosure, terminals]);

  // Convertir efectivo VES a USD según la tasa vigente de la caja activa
  const exchangeRate = activeClosure?.exchange_rate_closure || currentRate?.rate_value || 45.00;

  // Manejar cambio en denominaciones USD
  const handleUsdDenomChange = (denom: string, val: string) => {
    const num = parseInt(val) || 0;
    setUsdDenoms(prev => ({ ...prev, [denom]: Math.max(0, num) }));
  };

  // Manejar cambio en denominaciones VES
  const handleVesDenomChange = (denom: string, val: string) => {
    const num = parseInt(val) || 0;
    setVesDenoms(prev => ({ ...prev, [denom]: Math.max(0, num) }));
  };

  // Manejadores bidireccionales para POS
  const handlePosUsdChange = (terminal: string, val: string) => {
    const num = parseFloat(val) || 0;
    const vesVal = val ? (num * exchangeRate).toFixed(2) : '';
    setPosDeclarations(prev => ({
      ...prev,
      [terminal]: { usd: val, ves: vesVal }
    }));
  };

  const handlePosVesChange = (terminal: string, val: string) => {
    const num = parseFloat(val) || 0;
    const usdVal = val ? (num / exchangeRate).toFixed(2) : '';
    setPosDeclarations(prev => ({
      ...prev,
      [terminal]: { usd: usdVal, ves: val }
    }));
  };

  // Manejadores bidireccionales para Billeteras Digitales
  const handleWalletUsdChange = (wallet: string, val: string) => {
    const num = parseFloat(val) || 0;
    const vesVal = val ? (num * exchangeRate).toFixed(2) : '';
    setDigitalWallets(prev => ({
      ...prev,
      [wallet]: { usd: val, ves: vesVal }
    }));
  };

  const handleWalletVesChange = (wallet: string, val: string) => {
    const num = parseFloat(val) || 0;
    const usdVal = val ? (num / exchangeRate).toFixed(2) : '';
    setDigitalWallets(prev => ({
      ...prev,
      [wallet]: { usd: usdVal, ves: val }
    }));
  };

  // Calcular totales acumulados
  const totalUsdCash = Object.entries(usdDenoms).reduce((sum, [denom, qty]) => sum + (parseFloat(denom) * qty), 0);
  const totalVesCash = Object.entries(vesDenoms).reduce((sum, [denom, qty]) => sum + (parseFloat(denom) * qty), 0);

  // Total de POS declarados
  const totalPosDeclarado = Object.values(posDeclarations).reduce((sum, item) => sum + (parseFloat(item.usd) || 0), 0);
  const totalPosDeclaradoVes = Object.values(posDeclarations).reduce((sum, item) => sum + (parseFloat(item.ves) || 0), 0);

  // Total de Billeteras Digitales
  const totalDigitalDeclarado = Object.values(digitalWallets).reduce((sum, item) => sum + (parseFloat(item.usd) || 0), 0);
  const totalDigitalDeclaradoVes = Object.values(digitalWallets).reduce((sum, item) => sum + (parseFloat(item.ves) || 0), 0);

  const totalVesCashInUsd = totalVesCash / exchangeRate;

  // Total declarado físicamente general (USD y VES)
  const totalDeclaradoFisicoUsd = totalUsdCash + totalVesCashInUsd + totalPosDeclarado + totalDigitalDeclarado;
  const totalDeclaradoFisicoVes = (totalUsdCash * exchangeRate) + totalVesCash + totalPosDeclaradoVes + totalDigitalDeclaradoVes;

  // Total de vales de la caja activa (teórico)
  const totalValesActivosUsd = activeClosure?.total_vouchers_amount || 0;

  // FÓRMULA DE CONCILIACIÓN TEÓRICA
  // Total Esperado = Saldo Inicial + Ventas Totales Declaradas en el Sistema - Vales Emitidos
  const totalEsperadoTeoricoUsd = (activeClosure?.opening_balance_usd || 0) + salesSystemUsd - totalValesActivosUsd;

  // Diferencia / Descuadre
  const discrepanciaUsd = totalDeclaradoFisicoUsd - totalEsperadoTeoricoUsd;

  // Estilo de badge y colores para la conciliación
  const getDiscrepancyStyle = () => {
    if (Math.abs(discrepanciaUsd) < 0.05) {
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500',
        text: 'Caja Cuadrada Exacta (Bs. 0.00)',
        color: 'emerald',
        icon: <CheckCircle className="text-emerald-500" size={24} />
      };
    } else if (discrepanciaUsd < 0) {
      const discrepanciaVes = discrepanciaUsd * exchangeRate;
      return {
        bg: 'bg-rose-500/10 border-rose-500/30 text-rose-500',
        text: `Faltante en Caja: -$${Math.abs(discrepanciaUsd).toFixed(2)} (≈ -Bs.${Math.abs(discrepanciaVes).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`,
        color: 'rose',
        icon: <AlertTriangle className="text-rose-500 animate-pulse" size={24} />
      };
    } else {
      const discrepanciaVes = discrepanciaUsd * exchangeRate;
      return {
        bg: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
        text: `Sobrante en Caja: +$${discrepanciaUsd.toFixed(2)} (≈ +Bs.${discrepanciaVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`,
        color: 'blue',
        icon: <Info className="text-blue-500" size={24} />
      };
    }
  };

  const statusStyle = getDiscrepancyStyle();

  // Abrir Caja
  const handleOpenRegister = async () => {
    if (!company?.id || !user?.id) return;

    // Si hay cajas registradas, obligar a seleccionar una
    const activeCajas = cajas.filter(c => c.status === 'active');
    if (activeCajas.length > 0 && !selectedCajaId) {
      Swal.fire('Error', 'Por favor seleccione la Caja Registradora desde donde operará.', 'warning');
      return;
    }

    const balance = parseFloat(openingBalance);
    if (isNaN(balance) || balance < 0) {
      Swal.fire('Error', 'Por favor ingrese un saldo inicial válido.', 'error');
      return;
    }

    const rate = currentRate?.rate_value || 45.00;
    const success = await openRegister(company.id, user.id, balance, rate, selectedCajaId || undefined);
    if (success) {
      Swal.fire({
        title: 'Caja Abierta',
        text: `Se ha abierto el turno con un fondo de $${balance.toFixed(2)} USD.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      
      // Limpiar y sincronizar
      setUsdDenoms({ '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '1': 0 });
      setVesDenoms({ '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0 });
      
      const resetPos: { [key: string]: { usd: string; ves: string } } = {};
      const activeTerms = terminals.filter(t => t.status === 'active');
      activeTerms.forEach(t => {
        resetPos[t.terminal_name] = { usd: '', ves: '' };
      });
      setPosDeclarations(resetPos);

      setDigitalWallets({
        'Pago Móvil': { usd: '', ves: '' },
        'Transferencia Bancaria': { usd: '', ves: '' },
        'Zelle': { usd: '', ves: '' },
        'Binance': { usd: '', ves: '' },
        'Paypal': { usd: '', ves: '' }
      });
      setSalesSystemUsd(0);
      setObservations('');
      setSelectedCajaId('');
      setIsOpeningModalOpen(false);

      // Refrescar listado
      fetchOpenClosures(company.id);
    } else {
      Swal.fire('Error', 'No se pudo abrir la caja registradora.', 'error');
    }
  };

  // Emitir un nuevo vale de caja
  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;
    const { employee_name, amount_usd, amount_ves, concept } = voucherForm;

    if (!employee_name.trim() || !concept.trim()) {
      Swal.fire('Error', 'Por favor complete todos los campos obligatorios.', 'warning');
      return;
    }

    const rate = currentRate?.rate_value || 45.00;
    let usdVal = parseFloat(amount_usd) || 0;
    let vesVal = parseFloat(amount_ves) || 0;

    if (usdVal <= 0 && vesVal <= 0) {
      Swal.fire('Error', 'Por favor ingrese un monto en USD o VES.', 'warning');
      return;
    }

    // Calcular equivalentes si se ingresó uno solo
    if (usdVal > 0 && vesVal === 0) {
      vesVal = usdVal * rate;
    } else if (vesVal > 0 && usdVal === 0) {
      usdVal = vesVal / rate;
    }

    const input = {
      employee_name: employee_name.trim(),
      amount_usd: usdVal,
      amount_ves: vesVal,
      exchange_rate: rate,
      concept: concept.trim(),
      status: 'pending' as const
    };

    const success = await addVoucher(company.id, input);
    if (success) {
      Swal.fire({
        title: 'Vale Emitido',
        text: `Se emitió el vale para ${employee_name} por $${usdVal.toFixed(2)} USD.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      setIsVoucherModalOpen(false);
      setVoucherForm({ employee_name: '', amount_usd: '', amount_ves: '', concept: '' });
      fetchVouchers(company.id);
    } else {
      Swal.fire('Error', 'Ocurrió un error al registrar el vale.', 'error');
    }
  };

  // Consolidar un vale (Rendir cuentas)
  const handleConsolidateVoucher = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Rendir / Consolidar Vale?',
      text: 'Confirme que el empleado ha entregado el soporte físico y se ha rendido la cuenta.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, consolidar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#8b5cf6'
    });

    if (result.isConfirmed && company?.id) {
      const success = await consolidateVoucher(id);
      if (success) {
        Swal.fire('Consolidado', 'El vale se ha marcado como consolidado.', 'success');
        fetchVouchers(company.id);
      }
    }
  };

  // Procesar Cierre y Consolidar Caja
  const handleProcessClosure = async () => {
    if (!activeClosure) return;

    const result = await Swal.fire({
      title: '¿Confirmar Cierre de Caja?',
      text: `Se consolidará la caja con un descuadre de $${discrepanciaUsd.toFixed(2)} USD. Esta acción no se puede deshacer.`,
      icon: Math.abs(discrepanciaUsd) > 0.05 ? 'warning' : 'info',
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar caja',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#8b5cf6',
      cancelButtonColor: '#6b7280'
    });

    if (result.isConfirmed && company?.id) {
      const pagoMovilVal = parseFloat(digitalWallets['Pago Móvil'].usd) || 0;
      const transferenciasVal = 
        (parseFloat(digitalWallets['Transferencia Bancaria'].usd) || 0) + 
        (parseFloat(digitalWallets['Zelle'].usd) || 0) + 
        (parseFloat(digitalWallets['Binance'].usd) || 0) + 
        (parseFloat(digitalWallets['Paypal'].usd) || 0);

      const posDetailsArray = Object.entries(posDeclarations).map(([name, item]: any) => {
        const term = terminals.find(t => t.terminal_name === name);
        return {
          terminal_id: term?.id || '',
          bank_name: term?.bank_name || '',
          terminal_name: name,
          usd: parseFloat(item.usd) || 0,
          ves: parseFloat(item.ves) || 0
        };
      });

      const input = {
        declared_usd_cash: totalUsdCash,
        declared_ves_cash: totalVesCash,
        declared_pos_total: totalPosDeclarado,
        declared_pagomovil: pagoMovilVal,
        declared_transfer: transferenciasVal,
        sales_system_usd: salesSystemUsd,
        total_vouchers_amount: totalValesActivosUsd,
        theoretical_total: totalEsperadoTeoricoUsd,
        discrepancy_amount: discrepanciaUsd,
        exchange_rate_closure: exchangeRate,
        observations: observations.trim(),
        declared_pos_details: posDetailsArray,
        cash_count_details: { usd: usdDenoms, ves: vesDenoms },
        digital_wallets_details: digitalWallets
      };

      const success = await processClosure(activeClosure.id, input);
      if (success) {
        Swal.fire({
          title: 'Cierre Exitoso',
          text: 'La caja se ha cerrado y consolidado para auditoría.',
          icon: 'success'
        });
        // Imprimir comprobante
        handlePrintReceipt({
          ...input,
          id: activeClosure.id,
          opening_balance_usd: activeClosure.opening_balance_usd,
          closing_date: new Date().toISOString(),
          status: 'closed',
          user_full_name: user?.full_name || 'Cajero'
        });

        setActiveClosure(null);
        fetchOpenClosures(company.id);
        fetchClosuresHistory(company.id);
      } else {
        Swal.fire('Error', 'No se pudo procesar el cierre de caja.', 'error');
      }
    }
  };

  // Guardar arqueo en Borrador (sin cerrar)
  const handleSaveDraft = async () => {
    if (!activeClosure || !company?.id) return;

    const pagoMovilVal = parseFloat(digitalWallets['Pago Móvil'].usd) || 0;
    const transferenciasVal = 
      (parseFloat(digitalWallets['Transferencia Bancaria'].usd) || 0) + 
      (parseFloat(digitalWallets['Zelle'].usd) || 0) + 
      (parseFloat(digitalWallets['Binance'].usd) || 0) + 
      (parseFloat(digitalWallets['Paypal'].usd) || 0);

    const posDetailsArray = Object.entries(posDeclarations).map(([name, item]: any) => {
      const term = terminals.find(t => t.terminal_name === name);
      return {
        terminal_id: term?.id || '',
        bank_name: term?.bank_name || '',
        terminal_name: name,
        usd: parseFloat(item.usd) || 0,
        ves: parseFloat(item.ves) || 0
      };
    });

    const input = {
      declared_usd_cash: totalUsdCash,
      declared_ves_cash: totalVesCash,
      declared_pos_total: totalPosDeclarado,
      declared_pagomovil: pagoMovilVal,
      declared_transfer: transferenciasVal,
      sales_system_usd: salesSystemUsd,
      total_vouchers_amount: totalValesActivosUsd,
      theoretical_total: totalEsperadoTeoricoUsd,
      discrepancy_amount: discrepanciaUsd,
      exchange_rate_closure: exchangeRate,
      observations: observations.trim(),
      declared_pos_details: posDetailsArray,
      cash_count_details: { usd: usdDenoms, ves: vesDenoms },
      digital_wallets_details: digitalWallets
    };

    const success = await saveDraftClosure(activeClosure.id, input);
    if (success) {
      Swal.fire({
        title: 'Borrador Guardado',
        text: 'Los valores de arqueo se han guardado temporalmente en la base de datos.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      fetchOpenClosures(company.id);
    } else {
      Swal.fire('Error', 'No se pudo guardar el borrador del arqueo.', 'error');
    }
  };

  // Generar impresión del ticket de arqueo
  const handlePrintReceipt = (closure: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formattedDate = new Date(closure.closing_date).toLocaleString('es-VE', {
      timeZone: 'America/Caracas'
    });

    const valesHTML = vouchers
      .filter((v: any) => v.cash_register_id === closure.id)
      .map(
        (v: any) => `
      <tr style="border-bottom: 1px dashed #ddd; font-size: 11px;">
        <td style="padding: 4px 0;">${v.employee_name}</td>
        <td style="padding: 4px 0;">${v.concept}</td>
        <td style="padding: 4px 0; text-align: right;">$${v.amount_usd.toFixed(2)}</td>
      </tr>
    `
      ).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Comprobante de Cierre de Caja - dShopping</title>
          <style>
            @media print {
              body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0; padding: 5px; color: #000; font-size: 12px; }
              .header { text-align: center; margin-bottom: 10px; }
              .logo { font-size: 16px; font-weight: bold; }
              .title { font-size: 14px; font-weight: bold; margin: 5px 0; border-bottom: 1px dashed #000; border-top: 1px dashed #000; padding: 3px 0; text-align: center; }
              .details { margin-bottom: 10px; font-size: 11px; }
              .table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
              .table th { border-bottom: 1px dashed #000; font-weight: bold; font-size: 11px; }
              .total-box { border: 1px solid #000; padding: 6px; margin: 10px 0; }
              .total-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px; }
              .total-row.main { font-weight: bold; font-size: 14px; border-top: 1px dashed #000; padding-top: 4px; }
              .footer { text-align: center; margin-top: 20px; font-size: 10px; }
              .signatures { display: flex; justify-content: space-between; margin-top: 30px; font-size: 11px; }
              .sig-line { width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 3px; }
            }
            body { font-family: 'Courier New', Courier, monospace; max-width: 400px; margin: 40px auto; padding: 20px; border: 1px solid #ccc; border-radius: 5px; }
            .header { text-align: center; margin-bottom: 10px; }
            .logo { font-size: 16px; font-weight: bold; }
            .title { font-size: 14px; font-weight: bold; margin: 5px 0; border-bottom: 1px dashed #000; border-top: 1px dashed #000; padding: 3px 0; text-align: center; }
            .details { margin-bottom: 10px; font-size: 11px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            .table th { border-bottom: 1px dashed #000; font-weight: bold; font-size: 11px; }
            .total-box { border: 1px solid #000; padding: 6px; margin: 10px 0; }
            .total-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px; }
            .total-row.main { font-weight: bold; font-size: 14px; border-top: 1px dashed #000; padding-top: 4px; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 30px; font-size: 11px; }
            .sig-line { width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 3px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">dShopping Lite</div>
            <div>${company?.name}</div>
            <div>RIF: ${company?.rif}</div>
          </div>
          
          <div class="title" style="${closure.status === 'open' ? 'color: #dc2626; border-color: #dc2626; border-style: dashed;' : ''}">
            ${closure.status === 'open' ? 'BORRADOR NO CONSOLIDADO' : 'ARQUEO DE CAJA DIARIO'}
          </div>
          
          ${closure.status === 'open' ? `
            <div style="background-color: #fef2f2; border: 1px dashed #f87171; color: #991b1b; padding: 6px; text-align: center; font-weight: bold; font-size: 11px; margin-bottom: 10px; border-radius: 4px;">
              *** COMPROBANTE PRELIMINAR / BORRADOR ***
            </div>
          ` : ''}

          <div class="details">
            <strong>Cierre ID:</strong> ${closure.id.substring(0, 8)}...<br/>
            <strong>Estado:</strong> ${closure.status === 'open' ? 'Borrador' : 'Consolidado/Cerrado'}<br/>
            <strong>Cajero:</strong> ${closure.user_full_name || user?.full_name}<br/>
            <strong>Fecha/Hora:</strong> ${formattedDate}<br/>
            <strong>Tasa de Cierre:</strong> ${closure.exchange_rate_closure.toFixed(2)} Bs/$
          </div>

          <div style="font-weight: bold; margin-bottom: 5px; font-size: 11px;">1. ENTRADAS DECLARADAS (FÍSICO)</div>
          <table class="table">
            <thead>
              <tr style="text-align: left; font-size: 11px;">
                <th>Canal</th>
                <th style="text-align: right;">Monto USD / VES</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Efectivo USD</td>
                <td style="text-align: right;">$${closure.declared_usd_cash.toFixed(2)} / Bs.${(closure.declared_usd_cash * closure.exchange_rate_closure).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Efectivo VES</td>
                <td style="text-align: right;">$${(closure.declared_ves_cash / closure.exchange_rate_closure).toFixed(2)} / Bs.${closure.declared_ves_cash.toFixed(2)}</td>
              </tr>
              ${closure.declared_pos_details && closure.declared_pos_details.length > 0 ?
                closure.declared_pos_details.map((pos: any) => `
                  <tr>
                    <td>POS - ${pos.terminal_name} (${pos.bank_name})</td>
                    <td style="text-align: right;">$${pos.usd.toFixed(2)} / Bs.${pos.ves.toFixed(2)}</td>
                  </tr>
                `).join('')
                :
                `
                <tr>
                  <td>Puntos de Venta (POS)</td>
                  <td style="text-align: right;">$${closure.declared_pos_total.toFixed(2)} / Bs.${(closure.declared_pos_total * closure.exchange_rate_closure).toFixed(2)}</td>
                </tr>
                `
              }
              ${Object.entries(digitalWallets).some(([_, v]) => (parseFloat(v.usd) || 0) > 0) ? 
                Object.entries(digitalWallets).map(([wallet, v]) => {
                  const usdVal = parseFloat(v.usd) || 0;
                  const vesVal = parseFloat(v.ves) || 0;
                  if (usdVal <= 0) return '';
                  return `
                    <tr>
                      <td>${wallet}</td>
                      <td style="text-align: right;">$${usdVal.toFixed(2)} / Bs.${vesVal.toFixed(2)}</td>
                    </tr>
                  `;
                }).join('')
                : 
                `
                <tr>
                  <td>Pago Móvil</td>
                  <td style="text-align: right;">$${closure.declared_pagomovil.toFixed(2)} / Bs.${(closure.declared_pagomovil * closure.exchange_rate_closure).toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Transferencias / Digital</td>
                  <td style="text-align: right;">$${closure.declared_transfer.toFixed(2)} / Bs.${(closure.declared_transfer * closure.exchange_rate_closure).toFixed(2)}</td>
                </tr>
                `
              }
            </tbody>
          </table>

          ${valesHTML ? `
            <div style="font-weight: bold; margin-bottom: 5px; font-size: 11px;">2. SALIDAS REGISTRADAS (VALES)</div>
            <table class="table">
              <thead>
                <tr style="text-align: left; font-size: 11px;">
                  <th>Empleado</th>
                  <th>Concepto</th>
                  <th style="text-align: right;">Monto USD / VES</th>
                </tr>
              </thead>
              <tbody>
                ${valesHTML}
              </tbody>
            </table>
          ` : ''}

          <div class="total-box">
            <div class="total-row">
              <span>Fondo Inicial:</span>
              <span>$${closure.opening_balance_usd.toFixed(2)} / Bs.${(closure.opening_balance_usd * closure.exchange_rate_closure).toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>(-) Vales Emitidos:</span>
              <span>-$${closure.total_vouchers_amount.toFixed(2)} / -Bs.${(closure.total_vouchers_amount * closure.exchange_rate_closure).toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Total Esperado (Teórico):</span>
              <span>$${closure.theoretical_total.toFixed(2)} / Bs.${(closure.theoretical_total * closure.exchange_rate_closure).toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Total Declarado (Físico):</span>
              <span>$${(closure.declared_usd_cash + (closure.declared_ves_cash / closure.exchange_rate_closure) + closure.declared_pos_total + closure.declared_pagomovil + closure.declared_transfer).toFixed(2)} / Bs.${((closure.declared_usd_cash * closure.exchange_rate_closure) + closure.declared_ves_cash + (closure.declared_pos_total * closure.exchange_rate_closure) + (closure.declared_pagomovil * closure.exchange_rate_closure) + (closure.declared_transfer * closure.exchange_rate_closure)).toFixed(2)}</span>
            </div>
            <div class="total-row main">
              <span>DESCUADRE:</span>
              <span>${closure.discrepancy_amount >= 0 ? '+' : ''}$${closure.discrepancy_amount.toFixed(2)} / ${closure.discrepancy_amount >= 0 ? '+' : ''}Bs.${(closure.discrepancy_amount * closure.exchange_rate_closure).toFixed(2)}</span>
            </div>
          </div>

          ${closure.observations ? `<div style="font-size: 11px; margin-bottom: 10px;"><strong>Obs:</strong> ${closure.observations}</div>` : ''}

          <div class="signatures">
            <div class="sig-line">Cajero</div>
            <div class="sig-line">Supervisor</div>
          </div>

          <div class="footer">
            <p>dShopping Lite - Control de Caja Inteligente<br/>¡Gracias por tu jornada!</p>
          </div>
          
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // =========================================================================
  // CONTROLADORES CRUD DE PUNTOS DE VENTA (POS)
  // =========================================================================

  const handleCreateOrUpdatePos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;

    const { bank_name, terminal_name, serial_number, status } = posForm;
    if (!bank_name || !terminal_name.trim()) {
      Swal.fire('Error', 'Por favor complete todos los campos obligatorios.', 'warning');
      return;
    }

    const input = {
      bank_name,
      terminal_name: terminal_name.trim(),
      serial_number: serial_number.trim() || undefined,
      status
    };

    let success = false;
    if (editingPos) {
      success = await updateTerminal(editingPos.id, input);
    } else {
      success = await createTerminal(company.id, input);
    }

    if (success) {
      Swal.fire({
        title: editingPos ? 'Punto de Venta Actualizado' : 'Punto de Venta Registrado',
        text: `El terminal se ha guardado correctamente.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      setIsPosModalOpen(false);
      setEditingPos(null);
      setPosForm({ bank_name: '', terminal_name: '', serial_number: '', status: 'active' });
      fetchTerminals(company.id);
    } else {
      Swal.fire('Error', 'Ocurrió un error al guardar el terminal POS.', 'error');
    }
  };

  const handleEditPosClick = (pos: any) => {
    setEditingPos(pos);
    setPosForm({
      bank_name: pos.bank_name,
      terminal_name: pos.terminal_name,
      serial_number: pos.serial_number || '',
      status: pos.status
    });
    setIsPosModalOpen(true);
  };

  const handleTogglePosStatus = async (pos: any) => {
    const nextStatus = pos.status === 'active' ? 'inactive' : 'active';
    const success = await updateTerminal(pos.id, { status: nextStatus });
    if (success && company?.id) {
      Swal.fire({
        title: 'Estado Actualizado',
        text: `El terminal se encuentra ahora ${nextStatus === 'active' ? 'Activo' : 'Inactivo'}.`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
      fetchTerminals(company.id);
    }
  };

  const handleDeletePosClick = async (posId: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar Punto de Venta?',
      text: 'Esta acción eliminará de forma permanente este terminal de cobro. No afectará arqueos históricos.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    });

    if (result.isConfirmed && company?.id) {
      const success = await deleteTerminal(posId);
      if (success) {
        Swal.fire('Eliminado', 'El terminal ha sido eliminado.', 'success');
        fetchTerminals(company.id);
      }
    }
  };

  // =========================================================================
  // CONTROLADORES CRUD DE CAJAS REGISTRADORAS (PUNTOS DE VENTA FÍSICOS)
  // =========================================================================

  const handleCreateOrUpdateCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;

    const { name, status } = cajaForm;
    if (!name.trim()) {
      Swal.fire('Error', 'Por favor complete todos los campos obligatorios.', 'warning');
      return;
    }

    const input = {
      name: name.trim(),
      status
    };

    let success = false;
    if (editingCaja) {
      success = await updateCaja(editingCaja.id, input);
    } else {
      success = await createCaja(company.id, input);
    }

    if (success) {
      Swal.fire({
        title: editingCaja ? 'Caja Actualizada' : 'Caja Registrada',
        text: `La caja se ha guardado correctamente.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      setIsCajaModalOpen(false);
      setEditingCaja(null);
      setCajaForm({ name: '', status: 'active' });
      fetchCajas(company.id);
    } else {
      Swal.fire('Error', 'Ocurrió un error al guardar la caja registradora.', 'error');
    }
  };

  const handleEditCajaClick = (caja: any) => {
    setEditingCaja(caja);
    setCajaForm({
      name: caja.name,
      status: caja.status
    });
    setIsCajaModalOpen(true);
  };

  const handleToggleCajaStatus = async (caja: any) => {
    const nextStatus = caja.status === 'active' ? 'inactive' : 'active';
    const success = await updateCaja(caja.id, { status: nextStatus });
    if (success && company?.id) {
      Swal.fire({
        title: 'Estado Actualizado',
        text: `La caja se encuentra ahora ${nextStatus === 'active' ? 'Activa' : 'Inactiva'}.`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
      fetchCajas(company.id);
    }
  };

  const handleDeleteCajaClick = async (cajaId: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar Caja Registradora?',
      text: 'Esta acción eliminará de forma permanente esta estación física de cobro. No afectará arqueos históricos.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    });

    if (result.isConfirmed && company?.id) {
      const success = await deleteCaja(cajaId);
      if (success) {
        Swal.fire('Eliminado', 'La caja registradora ha sido eliminada.', 'success');
        fetchCajas(company.id);
      }
    }
  };

  // Filtrar vales
  const filteredVouchers = vouchers.filter(v => {
    if (voucherFilter === 'all') return true;
    return v.status === voucherFilter;
  });

  return (
    <div className="space-y-6">
      {/* TABS DE SECCIÓN */}
      <div className="flex gap-2 bg-muted/10 p-1.5 rounded-2xl border border-border-main/50 max-w-xl no-print">
        <button
          onClick={() => setActiveTab('arqueo')}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'arqueo'
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'text-muted-foreground hover:text-text-main'
            }`}
        >
          <Coins size={16} />
          Arqueo de Caja
        </button>
        <button
          onClick={() => setActiveTab('vales')}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'vales'
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'text-muted-foreground hover:text-text-main'
            }`}
        >
          <Banknote size={16} />
          Vales ({vouchers.filter(v => v.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'historial'
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'text-muted-foreground hover:text-text-main'
            }`}
        >
          <History size={16} />
          Historial
        </button>
        <button
          onClick={() => setActiveTab('pos')}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'pos'
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'text-muted-foreground hover:text-text-main'
            }`}
        >
          <Store size={16} />
          Cajas & POS
        </button>
      </div>

      {/* VISTA DE ARQUEO Y DESGLOSE */}
      {activeTab === 'arqueo' && (
        <div className="space-y-6">
          {!activeClosure ? (
            /* LISTADO DE CAJAS ABIERTAS */
            <div className="space-y-6">
              <div className="glass-panel border border-border-main rounded-3xl p-6 flex flex-wrap gap-4 justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <FileSpreadsheet className="text-primary" size={24} />
                    Cierres de Cajas y Turnos Activos
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Seleccione un turno de caja activo para registrar arqueos, guardar borradores o realizar cierres consolidados.
                  </p>
                </div>
                <button
                  onClick={() => setIsOpeningModalOpen(true)}
                  className="btn-primary py-2.5 px-4 flex items-center gap-2 shadow-lg shadow-primary/10 cursor-pointer"
                >
                  <Plus size={16} />
                  Aperturar Turno de Caja
                </button>
              </div>

              {/* Listado */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {openClosures.length === 0 ? (
                  <div className="col-span-full glass-panel border border-border-main rounded-3xl p-12 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                      <Coins size={32} />
                    </div>
                    <div className="space-y-2 max-w-sm mx-auto">
                      <h4 className="text-lg font-bold">No hay Turnos de Caja Activos</h4>
                      <p className="text-xs text-muted-foreground">
                        No hay ninguna caja registradora abierta en este momento en tu empresa. Por favor, aperture una para comenzar.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsOpeningModalOpen(true)}
                      className="py-2.5 px-6 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/10 cursor-pointer text-xs"
                    >
                      Aperturar Primer Turno de Caja
                    </button>
                  </div>
                ) : (
                  openClosures.map((caja) => (
                    <div
                      key={caja.id}
                      className="glass-panel border border-border-main rounded-3xl p-6 space-y-4 hover:border-primary/40 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-xs font-bold font-mono tracking-wide">
                            ACTIVO / ABIERTO
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(caja.created_at).toLocaleDateString('es-VE')}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h4 className="font-bold text-text-main flex items-center gap-1.5">
                            <Store size={16} className="text-muted-foreground" />
                            {caja.cash_register_name || 'Sin Caja Vinculada'}
                          </h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <User size={12} />
                            Cajero: {caja.user_full_name}
                          </p>
                        </div>

                        <div className="border-t border-border-main/50 pt-3 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground font-semibold">Fondo Inicial:</span>
                            <p className="font-bold font-mono text-text-main">${caja.opening_balance_usd.toFixed(2)} USD</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-semibold">Tasa del Turno:</span>
                            <p className="font-bold font-mono text-emerald-500">{caja.exchange_rate_closure.toFixed(2)} Bs/$</p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveClosure(caja)}
                        className="w-full mt-4 py-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 rounded-xl font-bold transition-all text-xs cursor-pointer flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={14} />
                        Cargar y Realizar Arqueo
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Turnos Cerrados Recientes */}
              <div className="space-y-4 pt-6 border-t border-border-main/50 mt-8">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <History className="text-muted-foreground" size={20} />
                    Turnos Consolidados (Cerrados Recientes)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Lista de turnos completados y consolidados. Seleccione uno para exportar o reimprimir el comprobante oficial.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {closures.slice(0, 6).map((caja) => {
                    const totalDeclaradoUsd =
                      caja.declared_usd_cash +
                      (caja.declared_ves_cash / caja.exchange_rate_closure) +
                      caja.declared_pos_total +
                      caja.declared_pagomovil +
                      caja.declared_transfer;

                    return (
                      <div
                        key={caja.id}
                        className="glass-panel border border-border-main/70 rounded-3xl p-5 space-y-4 bg-muted/5 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="px-2.5 py-1 bg-muted border border-border-main rounded-full text-[10px] font-bold font-mono tracking-wide text-muted-foreground">
                              CERRADO / AUDITADO
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(caja.closing_date || caja.created_at).toLocaleDateString('es-VE')}
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            <h4 className="font-bold text-text-main flex items-center gap-1.5 text-xs">
                              <Store size={14} className="text-muted-foreground" />
                              Caja: {caja.cash_register_name || 'Sin Caja'}
                            </h4>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <User size={10} />
                              Cajero: {caja.user_full_name}
                            </p>
                          </div>
                          
                          <div className="border-t border-border-main/50 pt-2 grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-muted-foreground font-semibold">Diferencia:</span>
                              <p className={`font-bold font-mono ${
                                caja.discrepancy_amount < -0.05 ? 'text-rose-500' :
                                caja.discrepancy_amount > 0.05 ? 'text-blue-500' : 'text-emerald-500'
                              }`}>
                                {caja.discrepancy_amount >= 0 ? '+' : ''}${caja.discrepancy_amount.toFixed(2)} USD
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground font-semibold">Total Físico:</span>
                              <p className="font-bold font-mono text-text-main">
                                ${totalDeclaradoUsd.toFixed(2)} USD
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handlePrintReceipt(caja)}
                          className="w-full mt-2 py-2 bg-muted hover:bg-muted/20 border border-border-main rounded-xl font-bold transition-all text-xs cursor-pointer flex items-center justify-center gap-1.5 text-text-main"
                        >
                          <Printer size={12} />
                          Exportar / Imprimir
                        </button>
                      </div>
                    );
                  })}
                  {closures.length === 0 && (
                    <div className="col-span-full py-8 text-center text-xs text-muted-foreground font-semibold bg-muted/5 border border-dashed border-border-main/40 rounded-2xl">
                      No hay turnos cerrados recientemente en el sistema.
                    </div>
                  )}
                </div>
              </div>

              {/* MODAL APERTURA DE CAJA VINCULADO A POS */}
              {isOpeningModalOpen && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-bg-main border border-border-main w-full max-w-md rounded-3xl p-6 shadow-2xl relative space-y-6">
                    <button
                      onClick={() => setIsOpeningModalOpen(false)}
                      className="absolute right-4 top-4 text-muted-foreground hover:text-text-main"
                    >
                      <X size={20} />
                    </button>

                    <div className="space-y-1 text-center">
                      <div className="mx-auto w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner mb-2">
                        <Store size={24} />
                      </div>
                      <h3 className="text-lg font-bold">Apertura de Turno de Caja</h3>
                      <p className="text-xs text-muted-foreground">
                        Seleccione la Caja Registradora física y digite el fondo de caja inicial.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Selector de Caja */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Seleccionar Caja Registradora *</label>
                        {cajas.filter(c => c.status === 'active').length === 0 ? (
                          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-bold text-center">
                            No tienes cajas registradas. 
                            <button
                              onClick={() => {
                                setIsOpeningModalOpen(false);
                                setActiveTab('pos');
                              }}
                              className="underline ml-1 cursor-pointer"
                            >
                              Ir a Cajas & POS
                            </button>
                          </div>
                        ) : (
                          <Select
                            required
                            value={selectedCajaId}
                            onChange={(e) => setSelectedCajaId(e.target.value)}
                            className="bg-muted/20 text-sm font-medium border-border-main"
                          >
                            <option value="" disabled className="bg-slate-900 text-slate-100">Seleccione la caja física de cobro</option>
                            {cajas.filter(c => c.status === 'active').map((c) => (
                              <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100">
                                {c.name}
                              </option>
                            ))}
                          </Select>
                        )}
                      </div>

                      {/* Saldo Inicial */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Fondo Inicial en USD *</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground font-mono">$</span>
                          <input
                            type="number"
                            value={openingBalance}
                            onChange={(e) => setOpeningBalance(e.target.value)}
                            className="w-full bg-muted/20 border border-border-main rounded-xl pl-8 pr-12 py-3 font-bold font-mono focus:outline-none focus:border-primary text-center text-lg"
                            placeholder="0.00"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground uppercase font-mono">USD</span>
                        </div>
                      </div>

                      {/* Tasa Cambiaria */}
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex justify-between items-center text-xs font-semibold">
                        <span className="text-muted-foreground">Tasa Cambiaria Global:</span>
                        <span className="text-emerald-500 font-mono">{currentRate?.rate_value?.toFixed(2) || '45.00'} Bs/$</span>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsOpeningModalOpen(false)}
                          className="flex-1 py-3 border border-border-main hover:bg-muted/10 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleOpenRegister}
                          disabled={cashLoading}
                          className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2 cursor-pointer text-xs"
                        >
                          <Check size={16} />
                          Abrir Turno
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* CAJA ACTIVA E INTERFAZ DE ARQUEO */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* DESGLOSE FÍSICO DE MONEDAS */}
              <div className="lg:col-span-2 space-y-6">
                {/* Cabecera Turno Activo */}
                <div className="glass-panel border border-border-main rounded-3xl p-6 flex flex-wrap gap-4 justify-between items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      <h4 className="text-lg font-bold tracking-tight">Turno de Caja Activo</h4>
                      <button
                        onClick={() => setActiveClosure(null)}
                        className="ml-3 px-3 py-1 bg-muted hover:bg-muted/30 text-muted-foreground hover:text-text-main border border-border-main/50 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <X size={12} />
                        Volver a Lista
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">ID: {activeClosure.id} | Caja: {activeClosure.cash_register_name || 'Sin Caja'}</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Fondo Inicial</span>
                      <p className="text-base font-bold font-mono">${activeClosure.opening_balance_usd.toFixed(2)}</p>
                    </div>
                    <div className="text-right border-l border-border-main pl-4">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Tasa de Turno</span>
                      <p className="text-base font-bold font-mono text-emerald-500">{exchangeRate.toFixed(2)} Bs/$</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* EFECTIVO EN DIVISAS (USD) */}
                  <div className="glass-panel border border-border-main rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-border-main pb-3">
                      <h4 className="font-bold flex items-center gap-2 text-primary">
                        <DollarSign size={18} />
                        Efectivo en Divisas (USD)
                      </h4>
                      <span className="text-lg font-bold font-mono text-primary">${totalUsdCash.toFixed(2)}</span>
                    </div>

                    <div className="space-y-2">
                      {Object.keys(usdDenoms).map((denom) => (
                        <div key={denom} className="flex justify-between items-center gap-3 py-1">
                          <label className="text-sm font-semibold font-mono w-16">Billetes ${denom}</label>
                          <input
                            type="number"
                            min="0"
                            value={usdDenoms[denom] || ''}
                            onChange={(e) => handleUsdDenomChange(denom, e.target.value)}
                            className="w-24 bg-muted/20 border border-border-main rounded-xl px-3 py-2 text-sm font-bold font-mono text-center focus:outline-none focus:border-primary"
                            placeholder="0"
                          />
                          <span className="text-sm font-semibold font-mono text-muted-foreground w-20 text-right">
                            ${(parseFloat(denom) * (usdDenoms[denom] || 0)).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* EFECTIVO EN BOLÍVARES (VES) */}
                  <div className="glass-panel border border-border-main rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-border-main pb-3">
                      <h4 className="font-bold flex items-center gap-2 text-emerald-500">
                        <Banknote size={18} />
                        Efectivo en Bs. (VES)
                      </h4>
                      <div className="text-right">
                        <span className="text-lg font-bold font-mono text-emerald-500">{totalVesCash.toLocaleString('es-VE')} Bs.</span>
                        <p className="text-[10px] text-muted-foreground font-mono">≈ ${totalVesCashInUsd.toFixed(2)} USD</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {Object.keys(vesDenoms).map((denom) => (
                        <div key={denom} className="flex justify-between items-center gap-3 py-1">
                          <label className="text-sm font-semibold font-mono w-16">Billetes Bs.{denom}</label>
                          <input
                            type="number"
                            min="0"
                            value={vesDenoms[denom] || ''}
                            onChange={(e) => handleVesDenomChange(denom, e.target.value)}
                            className="w-24 bg-muted/20 border border-border-main rounded-xl px-3 py-2 text-sm font-bold font-mono text-center focus:outline-none focus:border-primary"
                            placeholder="0"
                          />
                          <span className="text-sm font-semibold font-mono text-muted-foreground w-20 text-right">
                            {((parseFloat(denom) * (vesDenoms[denom] || 0))).toLocaleString('es-VE')} Bs
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CANALES DE PAGO ELECTRÓNICOS Y PUNTOS DE VENTA */}
                <div className="glass-panel border border-border-main rounded-3xl p-6 space-y-4">
                  <div className="flex flex-col gap-1 border-b border-border-main pb-3">
                    <h4 className="font-bold flex items-center gap-2 text-primary">
                      <CreditCard size={18} />
                      Puntos de Venta (POS) & Canales Electrónicos
                    </h4>
                    <span className="text-[10px] text-muted-foreground">
                      * El sistema almacena los datos en **Dólares ($)**. Digite en Bs. o en $ y la conversión se auto-calculará de forma bidireccional.
                    </span>
                  </div>

                  <div className="space-y-6">
                    {/* inputs de POS */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border-main/30 pb-1.5">
                        <span>Terminal POS</span>
                        <span className="text-center">Monto en Bs. (VES)</span>
                        <span className="text-center">Monto en $ (USD)</span>
                      </div>

                      {Object.keys(posDeclarations).length === 0 ? (
                        <div className="text-center py-6 text-xs font-semibold text-muted-foreground bg-muted/5 rounded-2xl border border-dashed border-border-main/50 space-y-2">
                          <p>No tienes terminales POS activos registrados en tu empresa.</p>
                          <button
                            onClick={() => setActiveTab('pos')}
                            className="py-1 px-3 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-all text-xs font-bold cursor-pointer"
                          >
                            Registrar terminal POS
                          </button>
                        </div>
                      ) : (
                        Object.keys(posDeclarations).map((terminal) => (
                          <div key={terminal} className="grid grid-cols-3 gap-2 items-center">
                            <label className="text-xs font-semibold">{terminal}</label>
                            
                            {/* Input en Bs. */}
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground font-mono">Bs.</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={posDeclarations[terminal].ves}
                                onChange={(e) => handlePosVesChange(terminal, e.target.value)}
                                className="w-full bg-muted/20 border border-border-main rounded-xl pl-8 pr-2 py-1.5 text-xs font-bold font-mono text-right focus:outline-none focus:border-primary text-emerald-500"
                                placeholder="0.00"
                              />
                            </div>

                            {/* Input en USD */}
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground font-mono">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={posDeclarations[terminal].usd}
                                onChange={(e) => handlePosUsdChange(terminal, e.target.value)}
                                className="w-full bg-muted/20 border border-border-main rounded-xl pl-6 pr-2 py-1.5 text-xs font-bold font-mono text-right focus:outline-none focus:border-primary"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        ))
                      )}

                      <div className="flex justify-between items-center border-t border-border-main pt-3 text-xs font-bold bg-muted/5 p-3 rounded-2xl">
                        <span>Total POS Declarado:</span>
                        <span className="font-mono text-primary">
                          ${totalPosDeclarado.toFixed(2)} USD <span className="text-muted-foreground font-normal">/</span> <span className="text-emerald-500 font-mono">{totalPosDeclaradoVes.toLocaleString('es-VE')} Bs.</span>
                        </span>
                      </div>

                      {/* inputs de Otros Canales y Billeteras */}
                      <div className="space-y-4 border-t border-border-main/50 pt-4">
                        <div className="grid grid-cols-3 gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border-main/30 pb-1.5">
                          <span>Billetera / Pago</span>
                          <span className="text-center">Monto en Bs. (VES)</span>
                          <span className="text-center">Monto en $ (USD)</span>
                        </div>

                        {Object.keys(digitalWallets).map((wallet) => (
                          <div key={wallet} className="grid grid-cols-3 gap-2 items-center">
                            <label className="text-xs font-semibold">{wallet}</label>
                            
                            {/* Input en Bs. */}
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground font-mono">Bs.</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={digitalWallets[wallet].ves}
                                onChange={(e) => handleWalletVesChange(wallet, e.target.value)}
                                className="w-full bg-muted/20 border border-border-main rounded-xl pl-8 pr-2 py-1.5 text-xs font-bold font-mono text-right focus:outline-none focus:border-primary text-emerald-500"
                                placeholder="0.00"
                              />
                            </div>

                            {/* Input en USD */}
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground font-mono">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={digitalWallets[wallet].usd}
                                onChange={(e) => handleWalletUsdChange(wallet, e.target.value)}
                                className="w-full bg-muted/20 border border-border-main rounded-xl pl-6 pr-2 py-1.5 text-xs font-bold font-mono text-right focus:outline-none focus:border-primary"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        ))}

                        {/* Separador de alta calidad al final de las formas de pago antes del resumen */}
                        <div className="border-t border-dashed border-border-main/40 my-4 pt-2"></div>

                        <div className="flex justify-between items-center text-xs font-bold bg-muted/5 p-3 rounded-2xl">
                          <span>Total Medios Digitales:</span>
                          <span className="font-mono text-primary">
                            ${totalDigitalDeclarado.toFixed(2)} USD <span className="text-muted-foreground font-normal">/</span> <span className="text-emerald-500 font-mono">{totalDigitalDeclaradoVes.toLocaleString('es-VE')} Bs.</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PANEL CENTRAL DE CONCILIACIÓN */}
              <div className="space-y-6">
                <div className="glass-panel border border-border-main rounded-3xl p-6 space-y-6 sticky top-6">
                  <h4 className="font-bold flex items-center gap-2 border-b border-border-main pb-3">
                    <FileSpreadsheet size={18} />
                    Resumen de Auditoría y Conciliación
                  </h4>

                  {/* Campo Ventas Totales del Sistema */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                      Ventas Registradas en Sistema (Z)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground font-mono">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={salesSystemUsd || ''}
                        onChange={(e) => setSalesSystemUsd(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full bg-muted/20 border border-border-main rounded-2xl pl-8 pr-4 py-3 font-bold font-mono focus:outline-none focus:border-primary"
                        placeholder="0.00"
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      *Digita el monto de ventas del sistema para cruzar con el efectivo contado y los POS.
                    </span>
                  </div>

                  <div className="space-y-3 pt-2 text-sm">
                    <div className="flex justify-between font-medium">
                      <span className="text-muted-foreground">Saldo Inicial (Fondo):</span>
                      <span className="font-mono">${activeClosure.opening_balance_usd.toFixed(2)} USD <span className="text-muted-foreground text-xs">(≈ Bs.{(activeClosure.opening_balance_usd * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span></span>
                    </div>
                    <div className="flex justify-between font-medium text-rose-500">
                      <span className="text-rose-500">(-) Vales de Caja del Turno:</span>
                      <span className="font-mono">-${totalValesActivosUsd.toFixed(2)} USD <span className="text-muted-foreground text-xs">(≈ -Bs.{(totalValesActivosUsd * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span></span>
                    </div>
                    <div className="flex justify-between font-medium text-emerald-500">
                      <span className="text-emerald-500">(+) Ventas del Sistema:</span>
                      <span className="font-mono">+${salesSystemUsd.toFixed(2)} USD <span className="text-muted-foreground text-xs">(≈ +Bs.{(salesSystemUsd * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span></span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-border-main pt-2 text-base">
                      <span>Total Teórico Esperado:</span>
                      <span className="font-mono">${totalEsperadoTeoricoUsd.toFixed(2)} USD <span className="text-muted-foreground text-xs font-normal">(≈ Bs.{(totalEsperadoTeoricoUsd * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span></span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border-main/50">
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-muted-foreground">Total Físico Declarado:</span>
                      <span className="font-mono text-primary">${totalDeclaradoFisicoUsd.toFixed(2)} USD <span className="text-muted-foreground text-xs font-normal">(≈ Bs.{totalDeclaradoFisicoVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span></span>
                    </div>

                    {/* Cuadro Dinámico de Descuadre */}
                    <div className={`border rounded-2xl p-4 flex gap-3 items-center ${statusStyle.bg}`}>
                      {statusStyle.icon}
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-wider">Auditoría del Turno</p>
                        <h4 className="text-base font-extrabold font-mono mt-0.5">{statusStyle.text}</h4>
                      </div>
                    </div>
                  </div>

                  {/* Observaciones de Cierre */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Observaciones / Novedades</label>
                    <textarea
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      rows={3}
                      className="w-full bg-muted/20 border border-border-main rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground/50 resize-none"
                      placeholder="Indique motivos de descuadre o incidencias..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={handleSaveDraft}
                      className="py-3 border border-primary/30 hover:bg-primary/5 text-primary rounded-2xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
                    >
                      <Check size={14} />
                      Guardar Borrador
                    </button>
                    <button
                      onClick={() => handlePrintReceipt({
                        ...activeClosure,
                        declared_usd_cash: totalUsdCash,
                        declared_ves_cash: totalVesCash,
                        declared_pos_total: totalPosDeclarado,
                        declared_pagomovil: parseFloat(digitalWallets['Pago Móvil'].usd) || 0,
                        declared_transfer: (parseFloat(digitalWallets['Transferencia Bancaria'].usd) || 0) + (parseFloat(digitalWallets['Zelle'].usd) || 0) + (parseFloat(digitalWallets['Binance'].usd) || 0) + (parseFloat(digitalWallets['Paypal'].usd) || 0),
                        sales_system_usd: salesSystemUsd,
                        total_vouchers_amount: totalValesActivosUsd,
                        theoretical_total: totalEsperadoTeoricoUsd,
                        discrepancy_amount: discrepanciaUsd,
                        exchange_rate_closure: exchangeRate,
                        observations: observations.trim(),
                        status: 'open',
                        closing_date: new Date().toISOString()
                      })}
                      className="py-3 border border-border-main hover:bg-muted/10 text-muted-foreground hover:text-text-main rounded-2xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
                    >
                      <Printer size={14} />
                      Imprimir Borrador
                    </button>
                  </div>

                  <div className="border-t border-border-main/50 my-2 pt-2"></div>

                  <button
                    onClick={handleProcessClosure}
                    className="w-full py-4 bg-primary hover:bg-primary-hover text-white rounded-2xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle size={20} />
                    Procesar y Consolidar Cierre de Caja
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN DE VALES DE CAJA */}
      {activeTab === 'vales' && (
        <div className="space-y-6">
          <div className="glass-panel border border-border-main rounded-3xl p-6 flex flex-wrap gap-4 justify-between items-center">
            <div className="space-y-1">
              <h3 className="text-xl font-bold">Registro y Control de Vales de Caja</h3>
              <p className="text-sm text-muted-foreground">
                Gestione las salidas provisionales o gastos de caja del turno activo.
              </p>
            </div>
            <div className="flex gap-3">
              {/* Filtro */}
              <Select
                value={voucherFilter}
                onChange={(e) => setVoucherFilter(e.target.value as any)}
                className="bg-muted/20 text-sm font-semibold border-border-main"
              >
                <option value="all" className="bg-slate-900 text-slate-100">Todos los Vales</option>
                <option value="pending" className="bg-slate-900 text-slate-100">Pendientes por Rendir</option>
                <option value="consolidated" className="bg-slate-900 text-slate-100">Consolidados</option>
              </Select>

              <button
                onClick={() => {
                  if (!activeClosure) {
                    Swal.fire('Caja Cerrada', 'Debe abrir una caja operativa para poder emitir vales.', 'warning');
                    return;
                  }
                  setIsVoucherModalOpen(true);
                }}
                className="btn-primary py-2.5 px-4 flex items-center gap-2 shadow-lg shadow-primary/10"
              >
                <Plus size={16} />
                Nuevo Vale
              </button>
            </div>
          </div>

          {/* Listado de Vales */}
          <div className="glass-panel border border-border-main rounded-3xl overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-muted/10 border-b border-border-main text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="p-4">Beneficiario / Empleado</th>
                    <th className="p-4">Fecha Emisión</th>
                    <th className="p-4">Concepto / Motivo</th>
                    <th className="p-4 text-right">Monto (USD)</th>
                    <th className="p-4 text-right">Monto (VES)</th>
                    <th className="p-4 text-center">Estado</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main/50 text-sm">
                  {filteredVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground font-semibold">
                        No hay vales registrados con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredVouchers.map((voucher) => (
                      <tr key={voucher.id} className="hover:bg-muted/5 transition-colors">
                        <td className="p-4 font-bold flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                            {voucher.employee_name.substring(0, 2)}
                          </div>
                          {voucher.employee_name}
                        </td>
                        <td className="p-4 font-mono text-xs">
                          {new Date(voucher.created_at).toLocaleString('es-VE', {
                            timeZone: 'America/Caracas'
                          })}
                        </td>
                        <td className="p-4 text-muted-foreground font-medium">{voucher.concept}</td>
                        <td className="p-4 text-right font-mono font-bold">${voucher.amount_usd.toFixed(2)}</td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-500">
                          {voucher.amount_ves.toLocaleString('es-VE')} Bs.
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${voucher.status === 'pending'
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                            }`}>
                            {voucher.status === 'pending' ? 'Pendiente' : 'Consolidado'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {voucher.status === 'pending' ? (
                            <button
                              onClick={() => handleConsolidateVoucher(voucher.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/15 cursor-pointer flex items-center gap-1 mx-auto"
                            >
                              <Check size={12} />
                              Consolidar
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground font-semibold flex items-center justify-center gap-1">
                              <CheckCircle size={14} className="text-emerald-500" />
                              Rendido
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MODAL NUEVO VALE */}
          {isVoucherModalOpen && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-bg-main border border-border-main w-full max-w-md rounded-3xl p-6 shadow-2xl relative space-y-6">
                <button
                  onClick={() => setIsVoucherModalOpen(false)}
                  className="absolute right-4 top-4 text-muted-foreground hover:text-text-main"
                >
                  <X size={20} />
                </button>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold">Emitir Vale de Caja</h3>
                  <p className="text-xs text-muted-foreground">
                    Registre una salida de efectivo del turno activo. Se calculará el equivalente según la tasa del día.
                  </p>
                </div>

                <form onSubmit={handleCreateVoucher} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Empleado / Beneficiario *</label>
                    <input
                      type="text"
                      required
                      value={voucherForm.employee_name}
                      onChange={(e) => setVoucherForm({ ...voucherForm, employee_name: e.target.value })}
                      className="w-full bg-muted/20 border border-border-main rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary font-medium"
                      placeholder="Nombre del empleado"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Monto en USD</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground font-mono">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={voucherForm.amount_usd}
                          onChange={(e) => setVoucherForm({ ...voucherForm, amount_usd: e.target.value })}
                          className="w-full bg-muted/20 border border-border-main rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary font-mono font-bold"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Monto en VES (Bs.)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground font-mono">Bs.</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={voucherForm.amount_ves}
                          onChange={(e) => setVoucherForm({ ...voucherForm, amount_ves: e.target.value })}
                          className="w-full bg-muted/20 border border-border-main rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary font-mono font-bold text-emerald-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/10 rounded-xl p-3 flex justify-between text-xs font-semibold text-muted-foreground">
                    <span>Tasa de Conversión:</span>
                    <span className="font-mono text-emerald-500">{currentRate?.rate_value?.toFixed(2) || '45.00'} Bs/$</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Concepto / Motivo *</label>
                    <textarea
                      required
                      rows={3}
                      value={voucherForm.concept}
                      onChange={(e) => setVoucherForm({ ...voucherForm, concept: e.target.value })}
                      className="w-full bg-muted/20 border border-border-main rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground/50 resize-none"
                      placeholder="Ej: Adelanto quincena, Compra artículos de limpieza urgentes..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check size={16} />
                    Emitir y Descontar de Caja
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN DE HISTORIAL DE CIERRES */}
      {activeTab === 'historial' && (
        <div className="glass-panel border border-border-main rounded-3xl overflow-hidden shadow-md">
          <div className="p-6 border-b border-border-main flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold">Historial de Cierres Consolidados</h3>
              <p className="text-sm text-muted-foreground">
                Auditoría histórica de cierres de caja y descuadres.
              </p>
            </div>
            <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold font-mono">
              {closures.length} Cierres
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-muted/10 border-b border-border-main text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="p-4">Fecha Cierre</th>
                  <th className="p-4">Cajero / Operador</th>
                  <th className="p-4 text-right">Fondo Inicial (USD)</th>
                  <th className="p-4 text-right">Efectivo USD</th>
                  <th className="p-4 text-right">Efectivo VES (Bs)</th>
                  <th className="p-4 text-right">POS / Pago Móvil</th>
                  <th className="p-4 text-right">Teórico</th>
                  <th className="p-4 text-right">Descuadre</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main/50 text-sm">
                {closures.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground font-semibold">
                      No hay registros de cierres consolidados en el sistema.
                    </td>
                  </tr>
                ) : (
                  closures.map((closure) => {
                    const totalFisicoUsd =
                      closure.declared_usd_cash +
                      (closure.declared_ves_cash / closure.exchange_rate_closure) +
                      closure.declared_pos_total +
                      closure.declared_pagomovil +
                      closure.declared_transfer;

                    const desc = closure.discrepancy_amount;
                    let descColor = 'text-emerald-500 font-bold';
                    let descText = 'Cuadrado';

                    if (desc < -0.05) {
                      descColor = 'text-rose-500 font-bold';
                      descText = `-$${Math.abs(desc).toFixed(2)}`;
                    } else if (desc > 0.05) {
                      descColor = 'text-blue-500 font-bold';
                      descText = `+$${desc.toFixed(2)}`;
                    }

                    return (
                      <tr key={closure.id} className="hover:bg-muted/5 transition-colors">
                        <td className="p-4 font-mono text-xs">
                          {new Date(closure.closing_date || closure.created_at).toLocaleString('es-VE', {
                            timeZone: 'America/Caracas'
                          })}
                        </td>
                        <td className="p-4 font-bold flex items-center gap-2">
                          <User size={14} className="text-muted-foreground" />
                          {closure.user_full_name}
                        </td>
                        <td className="p-4 text-right font-mono text-xs">
                          ${closure.opening_balance_usd.toFixed(2)} USD
                          <div className="text-[10px] text-muted-foreground font-semibold">
                            Bs.{(closure.opening_balance_usd * closure.exchange_rate_closure).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono text-xs">
                          ${closure.declared_usd_cash.toFixed(2)} USD
                          <div className="text-[10px] text-muted-foreground font-semibold">
                            Bs.{(closure.declared_usd_cash * closure.exchange_rate_closure).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono text-xs text-emerald-500">
                          Bs.{closure.declared_ves_cash.toLocaleString('es-VE')}
                          <div className="text-[10px] text-muted-foreground font-semibold font-mono">
                            ${(closure.declared_ves_cash / closure.exchange_rate_closure).toFixed(2)} USD
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono text-xs">
                          ${(closure.declared_pos_total + closure.declared_pagomovil + closure.declared_transfer).toFixed(2)} USD
                          <div className="text-[10px] text-muted-foreground font-semibold">
                            Bs.{((closure.declared_pos_total + closure.declared_pagomovil + closure.declared_transfer) * closure.exchange_rate_closure).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono text-xs font-bold">
                          ${closure.theoretical_total.toFixed(2)} USD
                          <div className="text-[10px] text-muted-foreground font-semibold font-mono">
                            Bs.{(closure.theoretical_total * closure.exchange_rate_closure).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className={`p-4 text-right font-mono text-xs ${descColor}`}>
                          {descText} USD
                          <div className="text-[10px] text-muted-foreground font-semibold font-mono">
                            {desc >= 0 ? '+' : ''}Bs.{(desc * closure.exchange_rate_closure).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handlePrintReceipt(closure)}
                            className="p-2 border border-border-main hover:border-primary hover:bg-primary/5 hover:text-primary rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                            title="Imprimir Comprobante"
                          >
                            <Printer size={14} />
                            <span className="text-xs font-semibold">Imprimir</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECCIÓN DE GESTIÓN DE CAJAS & PUNTOS DE VENTA (POS) */}
      {activeTab === 'pos' && (
        <div className="space-y-6">
          <div className="glass-panel border border-border-main rounded-3xl p-6 flex flex-wrap gap-4 justify-between items-center">
            <div className="space-y-1">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Store className="text-primary" size={24} />
                Gestión de Cajas & Canales Electrónicos (POS)
              </h3>
              <p className="text-sm text-muted-foreground">
                Administre de forma independiente sus Cajas físicas (estaciones de venta) y los Terminales POS bancarios.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* PANEL DE CAJAS REGISTRADORAS */}
            <div className="glass-panel border border-border-main rounded-3xl p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-border-main/50 pb-3">
                  <div>
                    <h4 className="font-bold text-text-main flex items-center gap-2">
                      <Store size={18} className="text-primary" />
                      Cajas Registradoras (Puntos de Venta Físicos)
                    </h4>
                    <p className="text-xs text-muted-foreground">Estaciones físicas disponibles para abrir turnos operativos</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingCaja(null);
                      setCajaForm({ name: '', status: 'active' });
                      setIsCajaModalOpen(true);
                    }}
                    className="py-1.5 px-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition-all shadow-md shadow-primary/10 cursor-pointer text-xs flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    Nueva Caja
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-muted/10 border-b border-border-main text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="p-3">Nombre Estación</th>
                        <th className="p-3 text-center">Estado</th>
                        <th className="p-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-main/30">
                      {cajas.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-muted-foreground font-semibold">
                            No hay Cajas registradas. ¡Crea la primera!
                          </td>
                        </tr>
                      ) : (
                        cajas.map((caja) => (
                          <tr key={caja.id} className="hover:bg-muted/5 transition-colors">
                            <td className="p-3 font-bold text-text-main flex items-center gap-2">
                              <Store size={14} className="text-muted-foreground" />
                              {caja.name}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleToggleCajaStatus(caja)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                                  caja.status === 'active'
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                    : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                                }`}
                              >
                                {caja.status === 'active' ? 'Activo' : 'Inactivo'}
                              </button>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEditCajaClick(caja)}
                                  className="px-2 py-1 border border-border-main hover:border-primary hover:text-primary rounded-lg font-bold transition-all text-[10px]"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteCajaClick(caja.id)}
                                  className="px-2 py-1 border border-rose-500/20 hover:border-rose-500 hover:text-rose-500 rounded-lg font-bold transition-all text-[10px]"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* PANEL DE TERMINALES POS (CANALES DE PAGO) */}
            <div className="glass-panel border border-border-main rounded-3xl p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-border-main/50 pb-3">
                  <div>
                    <h4 className="font-bold text-text-main flex items-center gap-2">
                      <CreditCard size={18} className="text-primary" />
                      Terminales POS (Canales de Pago Bancarios)
                    </h4>
                    <p className="text-xs text-muted-foreground">Dispositivos electrónicos para cobros declarados en arqueo</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingPos(null);
                      setPosForm({ bank_name: '', terminal_name: '', serial_number: '', status: 'active' });
                      setIsPosModalOpen(true);
                    }}
                    className="py-1.5 px-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition-all shadow-md shadow-primary/10 cursor-pointer text-xs flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    Nuevo POS
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-muted/10 border-b border-border-main text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="p-3">Banco / POS</th>
                        <th className="p-3">Nombre Terminal</th>
                        <th className="p-3 text-center">Estado</th>
                        <th className="p-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-main/30">
                      {terminals.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-muted-foreground font-semibold">
                            No hay Puntos de Venta registrados. ¡Crea el primero!
                          </td>
                        </tr>
                      ) : (
                        terminals.map((pos) => (
                          <tr key={pos.id} className="hover:bg-muted/5 transition-colors">
                            <td className="p-3 font-bold text-text-main flex items-center gap-2">
                              <CreditCard size={14} className="text-muted-foreground" />
                              {pos.bank_name}
                            </td>
                            <td className="p-3 font-semibold">{pos.terminal_name}</td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleTogglePosStatus(pos)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                                  pos.status === 'active'
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                    : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                                }`}
                              >
                                {pos.status === 'active' ? 'Activo' : 'Inactivo'}
                              </button>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEditPosClick(pos)}
                                  className="px-2 py-1 border border-border-main hover:border-primary hover:text-primary rounded-lg font-bold transition-all text-[10px]"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeletePosClick(pos.id)}
                                  className="px-2 py-1 border border-rose-500/20 hover:border-rose-500 hover:text-rose-500 rounded-lg font-bold transition-all text-[10px]"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* MODAL CRUD NUEVO/EDITAR CAJA */}
          {isCajaModalOpen && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-bg-main border border-border-main w-full max-w-md rounded-3xl p-6 shadow-2xl relative space-y-6">
                <button
                  onClick={() => setIsCajaModalOpen(false)}
                  className="absolute right-4 top-4 text-muted-foreground hover:text-text-main"
                >
                  <X size={20} />
                </button>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold">
                    {editingCaja ? 'Editar Caja Registradora' : 'Registrar Caja Registradora'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Complete los datos para dar de alta o actualizar la estación física de cobro.
                  </p>
                </div>

                <form onSubmit={handleCreateOrUpdateCaja} className="space-y-4">
                  {/* Nombre de la Caja */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Nombre de la Caja *</label>
                    <input
                      type="text"
                      required
                      value={cajaForm.name}
                      onChange={(e) => setCajaForm({ ...cajaForm, name: e.target.value })}
                      className="w-full bg-muted/20 border border-border-main rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary font-medium"
                      placeholder="Ej: Caja Principal, Caja Auxiliar"
                    />
                  </div>

                  {/* Estado de la Caja */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Estado Operativo *</label>
                    <Select
                      required
                      value={cajaForm.status}
                      onChange={(e) => setCajaForm({ ...cajaForm, status: e.target.value as any })}
                      className="bg-muted/20 text-sm font-medium border-border-main"
                    >
                      <option value="active" className="bg-slate-900 text-slate-100">Activo (Disponible en Apertura)</option>
                      <option value="inactive" className="bg-slate-900 text-slate-100">Inactivo (No disponible en Apertura)</option>
                    </Select>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCajaModalOpen(false)}
                      className="flex-1 py-3 border border-border-main hover:bg-muted/10 rounded-xl text-sm font-bold transition-all cursor-pointer text-center"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Check size={16} />
                      Guardar Caja
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL CRUD NUEVO/EDITAR POS */}
          {isPosModalOpen && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-bg-main border border-border-main w-full max-w-md rounded-3xl p-6 shadow-2xl relative space-y-6">
                <button
                  onClick={() => setIsPosModalOpen(false)}
                  className="absolute right-4 top-4 text-muted-foreground hover:text-text-main"
                >
                  <X size={20} />
                </button>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold">
                    {editingPos ? 'Editar Punto de Venta (POS)' : 'Registrar Punto de Venta (POS)'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Complete los datos para dar de alta o actualizar el terminal electrónico de cobro.
                  </p>
                </div>

                <form onSubmit={handleCreateOrUpdatePos} className="space-y-4">
                  {/* Selector de Banco */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Banco Oficial de Venezuela *</label>
                    <Select
                      required
                      value={posForm.bank_name}
                      onChange={(e) => setPosForm({ ...posForm, bank_name: e.target.value })}
                      className="bg-muted/20 text-sm font-medium border-border-main"
                    >
                      <option value="" disabled className="bg-slate-900 text-slate-100">Seleccione un Banco</option>
                      {BANCOS_VENEZUELA.map((banco) => (
                        <option key={banco} value={banco} className="bg-slate-900 text-slate-100">
                          {banco}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Nombre del Terminal */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Nombre descriptivo de Terminal *</label>
                    <input
                      type="text"
                      required
                      value={posForm.terminal_name}
                      onChange={(e) => setPosForm({ ...posForm, terminal_name: e.target.value })}
                      className="w-full bg-muted/20 border border-border-main rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary font-medium"
                      placeholder="Ej: Banesco Principal, BDV Caja 2"
                    />
                  </div>

                  {/* Número Serial */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Número Serial (Opcional)</label>
                    <input
                      type="text"
                      value={posForm.serial_number}
                      onChange={(e) => setPosForm({ ...posForm, serial_number: e.target.value })}
                      className="w-full bg-muted/20 border border-border-main rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary font-mono"
                      placeholder="Ej: SN-BAN-9982"
                    />
                  </div>

                  {/* Estado del POS */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Estado Operativo *</label>
                    <Select
                      required
                      value={posForm.status}
                      onChange={(e) => setPosForm({ ...posForm, status: e.target.value as any })}
                      className="bg-muted/20 text-sm font-medium border-border-main"
                    >
                      <option value="active" className="bg-slate-900 text-slate-100">Activo (Aparecerá en Arqueos)</option>
                      <option value="inactive" className="bg-slate-900 text-slate-100">Inactivo (No aparecerá en Arqueos)</option>
                    </Select>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsPosModalOpen(false)}
                      className="flex-1 py-3 border border-border-main hover:bg-muted/10 rounded-xl text-sm font-bold transition-all cursor-pointer text-center"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Check size={16} />
                      Guardar POS
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

