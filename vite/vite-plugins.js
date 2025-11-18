
import fs from 'fs';
import path from 'path';

// Plugin custom pour générer le template Twig
export function generateTwigTemplate() {
  return {
    name: 'generate-twig-template',
    async writeBundle(options, bundle) {
      try {
        // Lire le index.html généré
        const indexHtml = fs.readFileSync(path.join(options.dir, 'index.html'), 'utf8');
        
        // Convertir en template Twig
        const twigTemplate = convertHtmlToTwig(indexHtml);
        
        // Écrire dans templates/
        const templatePath = path.join('templates', 'home', 'index.html.twig');
        fs.mkdirSync(path.dirname(templatePath), { recursive: true });
        fs.writeFileSync(templatePath, twigTemplate);
        
        console.log('✅ Template Twig généré:', templatePath);
      } catch (error) {
        console.error('❌ Erreur génération template Twig:', error.message);
      }
    }
  }
}

function convertHtmlToTwig(html) {
  // 🚀 Extraire seulement le contenu du body
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1].trim() : '<div id="root"></div>';
  
  // 🚀 Extraire tous les éléments du head avec leurs attributs complets
  const scriptMatches = html.match(/<script[^>]*>/g) || [];
  const cssMatches = html.match(/<link[^>]*href="([^"]*\.css)"[^>]*>/g) || [];
  const manifestMatch = html.match(/<link[^>]*rel="manifest"[^>]*>/);
  const themeColorMatch = html.match(/<meta[^>]*name="theme-color"[^>]*>/);
  const faviconMatches = html.match(/<link[^>]*rel="icon"[^>]*>/g) || [];
  const appleTouchMatch = html.match(/<link[^>]*rel="apple-touch-icon"[^>]*>/);
  const viewportMatch = html.match(/<meta[^>]*name="viewport"[^>]*>/);
  
  // 🚀 Construire tous les éléments pour stylesheets
  let allElements = [];
  
  // Scripts avec tous les attributs (type, crossorigin, etc.)
  scriptMatches.forEach(script => {
    const srcMatch = script.match(/src="([^"]*)"/)?.[1];
    if (srcMatch) {
      const typeMatch = script.match(/type="([^"]*)"/)?.[1];
      const crossoriginMatch = script.match(/crossorigin/);
      
      let scriptTag = `\t<script`;
      if (typeMatch) scriptTag += ` type="${typeMatch}"`;
      if (crossoriginMatch) scriptTag += ` crossorigin`;
      scriptTag += ` src="{{ asset('${srcMatch}') }}"></script>`;
      
      allElements.push(scriptTag);
    }
  });
  
  // CSS avec tous les attributs (crossorigin, etc.)  
  cssMatches.forEach(link => {
    const hrefMatch = link.match(/href="([^"]*)"/)?.[1];
    if (hrefMatch) {
      const crossoriginMatch = link.match(/crossorigin/);
      
      let linkTag = `\t<link rel="stylesheet"`;
      if (crossoriginMatch) linkTag += ` crossorigin`;
      linkTag += ` href="{{ asset('${hrefMatch}') }}">`;
      
      allElements.push(linkTag);
    }
  });
  
  // Meta theme-color
  if (themeColorMatch) {
    const contentMatch = themeColorMatch[0].match(/content="([^"]*)"/)?.[1];
    if (contentMatch) {
      allElements.push(`\t<meta name="theme-color" content="${contentMatch}">`);
    }
  }
  
  // Meta viewport
  if (viewportMatch) {
    const contentMatch = viewportMatch[0].match(/content="([^"]*)"/)?.[1];
    if (contentMatch) {
      allElements.push(`\t<meta name="viewport" content="${contentMatch}">`);
    }
  }
  
  // Manifest
  if (manifestMatch) {
    const hrefMatch = manifestMatch[0].match(/href="([^"]*)"/)?.[1];
    if (hrefMatch) {
      allElements.push(`\t<link rel="manifest" href="{{ asset('${hrefMatch}') }}">`);
    }
  }
  
  // Favicons avec tous les attributs
  faviconMatches.forEach(favicon => {
    const hrefMatch = favicon.match(/href="([^"]*)"/)?.[1];
    if (hrefMatch) {
      const sizesMatch = favicon.match(/sizes="([^"]*)"/)?.[1];
      const typeMatch = favicon.match(/type="([^"]*)"/)?.[1];
      
      let faviconTag = `\t<link rel="icon" href="{{ asset('${hrefMatch}') }}"`;
      if (sizesMatch) faviconTag += ` sizes="${sizesMatch}"`;
      if (typeMatch) faviconTag += ` type="${typeMatch}"`;
      faviconTag += '>';
      
      allElements.push(faviconTag);
    }
  });
  
  // Apple touch icon
  if (appleTouchMatch) {
    const hrefMatch = appleTouchMatch[0].match(/href="([^"]*)"/)?.[1];
    if (hrefMatch) {
      allElements.push(`\t<link rel="apple-touch-icon" href="{{ asset('${hrefMatch}') }}">`);
    }
  }
  
  // 🚀 Template Twig avec tout dans stylesheets + formatage exact
  return `{% extends 'base.html.twig' %}

{% block title %}Cookbook App
{% endblock %}


{% block stylesheets %}
\t{{ parent() }}
${allElements.join('\n')}
{% endblock %}

{% block body %}
\t${bodyContent}
{% endblock %}`;
}